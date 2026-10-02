// POST /api/contact — contact form handler (Cloudflare Pages Function).
//
// Sends the lead to the team mailbox, and a short confirmation to the
// visitor, through Microsoft 365 (Graph sendMail). Falls back to Resend
// only if Microsoft 365 isn't configured.
//
// Settings (Cloudflare Pages project > Settings > Variables and Secrets):
//   GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET  Entra app with Mail.Send and Files.ReadWrite.All
//               (application) — the second saves each submission to OneDrive (lib/records.js)
//   MAIL_FROM   mailbox the app sends as     (default TheMatalegionGroup@Matalegion.com)
//   LEAD_TO     where new leads are delivered (default info.desk@matalegion.com,
//               an M365 alias on j.mata@)
//   RESEND_API_KEY, RESEND_FROM                optional fallback

import { DEFAULT_MAILBOX, PUBLIC_EMAIL, EMAIL_RE, badOrigin, tooLarge, send, esc } from "../lib/mail.js";
import { sendOptIn, isSubscribed } from "../lib/list.js";
import { saveSubmission } from "../lib/records.js";
import { findOpenRole, place } from "../lib/jobs.js";
import { badTiming, rateLimited, knownBot, looksSuspicious, failsTurnstile } from "../lib/spam.js";
import { emailShell, step, steps, button, accent, contactNote, P } from "../lib/email-layout.js";

const BOOKINGS = "https://bookings.cloud.microsoft/book/TheMatalegionGroup@Matalegion.com/s/";
const booking = (id) => `${BOOKINGS}${id}?ismsaljsauthenabled`;
const ROLES = ["General Manager", "Owner / Asset Manager", "Restaurant Owner / Operator", "Management Company", "Brand / Field Leadership", "Other"];

// "What can we help with?" → its questions (field: [label, max length, required, allowed values]),
// its consultation booking link, and how it's named in emails.
const SERVICES = {
  turnaround: {
    name: "Turnaround",
    booking: booking("gFvrMYiozkOG3k69TdE5zg2"),
    fields: { role: ["Role", 60, false, ROLES], location: ["Property location", 120], message: ["What's going on", 4000, true] },
  },
  staffing: {
    name: "Hiring (task force or staffing)",
    booking: booking("xu-5Bt-VHUyu8nMOEUzr5w2"),
    fields: {
      position: ["Role(s) to fill", 200, true],
      location: ["Property location", 120, true],
      hire: ["Interim or permanent", 40, false, ["Interim / task force", "Permanent", "Both", "Not sure yet"]],
      start: ["Needed by", 40, false, ["As soon as possible", "Within 30 days", "1–3 months", "3+ months"]],
      message: ["Details", 4000],
    },
  },
  renovation: {
    name: "Renovation, PIP or opening",
    booking: booking("bdcuvxhtrk-cTGIhXJM-1A2"),
    fields: {
      project: ["Project", 40, false, ["Renovation", "PIP", "New opening", "Reopening", "Brand conversion"]],
      brand: ["Brand or flag", 120],
      target: ["Target date", 60],
      location: ["Property location", 120],
      message: ["About the project", 4000, true],
    },
  },
  portfolio: {
    name: "Portfolio program",
    booking: booking("XUAdwphkc0aUXIA79fdKxA2"),
    fields: {
      properties: ["Number of properties", 20, false, ["2–5", "6–15", "16–50", "50+"]],
      role: ["Role", 60, false, ROLES],
      message: ["What to improve", 4000, true],
    },
  },
  candidate: {
    name: "Talent network (candidate)",
    booking: "",
    fields: {
      position: ["Current or most recent role", 160, true],
      location: ["Based in", 120, true],
      hire: ["Open to", 40, false, ["Interim / task force", "Permanent", "Both"]],
      move: ["Travel / relocation", 40, false, ["Open to travel and relocation", "Travel only", "Local roles only"]],
      link: ["LinkedIn", 300],
      message: ["Experience", 4000],
    },
  },
  other: {
    name: "General enquiry",
    booking: booking("qN74lV3f00qkEt6dNzEtkw2"),
    fields: { message: ["What's going on", 4000, true] },
  },
};
// Pages cached from before the service picker sent "need" instead of "service".
const FROM_NEED = {
  "Turnaround": "turnaround",
  "Interim / task force leadership": "staffing",
  "Staffing / permanent placement": "staffing",
  "Renovation, PIP or opening": "renovation",
  "Portfolio program (multiple properties)": "portfolio",
  "I'm a candidate (talent network)": "candidate",
};
// Resume upload (job seekers only): attached to the lead email, never stored or sent back.
const RESUME_MAX = 10 * 1024 * 1024;
const RESUME_TYPES = {
  pdf: ["application/pdf", [0x25, 0x50, 0x44, 0x46]],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [0x50, 0x4b, 0x03, 0x04]],
  doc: ["application/msword", [0xd0, 0xcf, 0x11, 0xe0]],
};
const COMMON = { name: ["Name", 120, true], email: ["Email", 200, true], phone: ["Phone", 40], company: ["Hotel, restaurant or company", 160, true] };

export async function onRequestPost({ request, env, waitUntil }) {
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  const reply = (status, body) =>
    wantsJson
      ? Response.json(body, { status })
      : status === 200
        ? Response.redirect(new URL("/thanks", request.url), 303)
        : new Response("Sorry, that didn't send. Please email " + PUBLIC_EMAIL, { status });

  if (badOrigin(request)) return reply(403, { ok: false, error: "forbidden" });
  if (tooLarge(request, RESUME_MAX + 64 * 1024)) return reply(413, { ok: false, error: "too_large" });

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: "bad_request" });
  }

  const key = String(form.get("service") || FROM_NEED[form.get("need")] || "other");
  const service = SERVICES[key] ? key : "other";
  const candidate = service === "candidate";
  const fields = { ...COMMON, ...SERVICES[service].fields };
  if (candidate) delete fields.company;

  // Without JavaScript every service's questions are sent, so take the first answer given.
  const lead = { service, page: String(form.get("page") || "").slice(0, 100) };
  // Applying for a listed role (Jobs page). Only open roles count; anything else is a
  // general talent-network sign-up. Title and place come from our list, never the form.
  const role = candidate ? findOpenRole(String(form.get("job") || "")) : null;
  if (role) Object.assign(lead, { job: role.title, jobSlug: role.slug, jobPlace: place(role) });
  for (const [name, [, max, , allowed]] of Object.entries(fields)) {
    const value = form.getAll(name).map((v) => String(v).trim()).find(Boolean) || "";
    lead[name] = allowed && !allowed.includes(value) ? "" : value.slice(0, max);
  }
  // LinkedIn is optional; accept "linkedin.com/in/…" typed without https://.
  if (lead.link && !/^https?:\/\//i.test(lead.link)) lead.link = `https://${lead.link}`;
  if (lead.link && !/^https?:\/\/[\w-]+(\.[\w-]+)+\S*$/i.test(lead.link)) lead.link = "";

  // Spam traps (functions/lib/spam.js). Bots get a normal-looking reply and nothing is sent.
  const drop = (why) => (console.log("spam_dropped", why), reply(200, { ok: true }));
  if (form.get("website")) return drop("honeypot");
  const timing = badTiming(form);
  // No page timestamp: not posted from our page (or scripts are blocked), so ask them to email.
  if (timing === "no_timestamp" || timing === "stale") return reply(400, { ok: false, error: "bad_request" });
  if (timing) return drop(timing);
  if (await rateLimited(request, "contact")) return drop("rate_limit");
  // Failed human check: a real person sees "please try again or email us" (site.js).
  const turnstile = await failsTurnstile(env, form, request);
  if (turnstile) return (console.log("spam_blocked", turnstile), reply(400, { ok: false, error: "verification_failed" }));

  const missing = Object.entries(fields).some(([name, [, , required]]) => required && !lead[name]);
  if (missing || !EMAIL_RE.test(lead.email)) return reply(422, { ok: false, error: "missing_fields" });

  const bot = knownBot(lead);
  if (bot) return drop(bot);
  const suspicious = looksSuspicious(lead);

  const resume = candidate ? await readResume(form.get("resume")) : null;
  if (resume?.error) return reply(422, { ok: false, error: resume.error });
  lead.resume = resume?.name || "";

  const from = env.MAIL_FROM || DEFAULT_MAILBOX;
  const to = env.LEAD_TO || PUBLIC_EMAIL;
  const notice = {
    to,
    replyTo: lead.email,
    subject: (suspicious ? "[Possible spam] " : "") + (lead.job
      ? `Application: ${lead.job}, ${lead.jobPlace} — ${lead.name}`
      : candidate
      ? `New candidate: ${lead.name} (${lead.position})`
      : service === "staffing"
        ? `Staffing request: ${lead.position} at ${lead.company}`
        : `New lead (${SERVICES[service].name}): ${lead.company} (${lead.name})`),
    html: leadHtml(lead, fields, request),
    attachments: resume ? [resume] : [],
  };
  const confirmation = {
    to: lead.email,
    replyTo: to,
    subject: lead.job ? `We've got your application for ${lead.job} — The Matalegion Group` : candidate ? "You're in our talent network — The Matalegion Group" : "We've got your details — The Matalegion Group",
    html: confirmationHtml(lead),
  };

  try {
    await send(env, from, notice);
  } catch (err) {
    console.error("lead_send_failed", err.message);
    return reply(502, { ok: false, error: "send_failed" });
  }
  // Possible spam: delivered (marked) above so no real lead is lost, but don't email the
  // address it gave, add it to the list, or copy it into the OneDrive sheets.
  if (suspicious) {
    console.log("spam_flagged", suspicious);
    return reply(200, { ok: true });
  }
  // Copy to the OneDrive sheets in the background; the email above is the record of last resort.
  const saving = saveSubmission(env, lead, SERVICES[service].name, resume).catch((err) => console.error("records_failed", err.message));
  if (waitUntil) waitUntil(saving);
  else await saving;
  // The lead is safe; a failed confirmation shouldn't fail the visitor's submit.
  await send(env, from, confirmation).catch((err) => console.error("confirmation_failed", err.message));
  // Ticked "Keep me in the know": send the mailing-list confirmation link too.
  if (form.get("newsletter") && !candidate) {
    const email = lead.email.toLowerCase();
    if (!(await isSubscribed(env, email).catch(() => false))) {
      await sendOptIn(env, email).catch((err) => console.error("optin_failed", err.message));
    }
  }

  return reply(200, { ok: true });
}

// A PDF or Word file (checked by its first bytes, not just its name) up to RESUME_MAX.
async function readResume(file) {
  if (!file || typeof file === "string" || !file.size) return null;
  const kind = RESUME_TYPES[(file.name.match(/\.([a-z]+)$/i)?.[1] || "").toLowerCase()];
  if (!kind || file.size > RESUME_MAX) return { error: "bad_resume" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!kind[1].every((b, i) => bytes[i] === b)) return { error: "bad_resume" };
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const name = file.name.replace(/[^\w.\- ]+/g, "_").slice(-100);
  return { name, type: kind[0], base64: btoa(binary) };
}

function leadHtml(lead, fields, request) {
  const row = (label, value) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">${label}</td><td style="padding:6px 0">${value}</td></tr>`;
  const rows = [row("Looking for", esc(SERVICES[lead.service].name))];
  if (lead.job) rows.push(row("Applied for", `<a href="https://thematalegion.com/jobs/${esc(lead.jobSlug)}">${esc(lead.job)}, ${esc(lead.jobPlace)}</a>`));
  for (const [name, [label]] of Object.entries(fields)) {
    if (name === "message" || !lead[name]) continue;
    const v = esc(lead[name]);
    rows.push(row(label, name === "email" ? `<a href="mailto:${v}">${v}</a>` : name === "link" ? `<a href="${v}">${v}</a>` : v));
  }
  if (lead.resume) rows.push(row("Resume", `attached (${esc(lead.resume)})`));
  if (lead.page) rows.push(row("Sent from", esc(lead.page)));
  const where = [request.cf?.city, request.cf?.region, request.cf?.country].filter(Boolean).join(", ");
  if (where) rows.push(row("Visitor location", esc(where)));
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
<h2 style="margin:0 0 12px">${lead.service === "candidate" ? "New talent network candidate" : lead.service === "staffing" ? "New staffing request" : "New website lead"}</h2>
<table style="border-collapse:collapse">${rows.join("")}</table>
${lead.message ? `<h3 style="margin:20px 0 8px">${fields.message[0]}</h3><p style="white-space:pre-wrap;margin:0">${esc(lead.message)}</p>` : ""}
<p style="margin-top:20px;color:#666">Hit Reply to answer ${esc(lead.name)} directly.</p></div>`;
}

function confirmationHtml(lead) {
  // Only a cleaned-up first name and a value from our own list are repeated back, never free
  // text, so nobody can use this form to send our branded email with their own words in it.
  const first = esc(lead.name.split(/\s+/)[0].replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 30));
  const ABOUT = { turnaround: "your turnaround", staffing: "the role you're hiring for", renovation: "your project", portfolio: "your portfolio" };
  const about = ABOUT[lead.service] || "your enquiry";
  const candidate = lead.service === "candidate";
  const staffing = lead.service === "staffing";
  const intro = lead.job
    ? `Thanks for applying for <strong>${esc(lead.job)}</strong> in ${esc(lead.jobPlace)}. Your application is with our team, and we'll be in touch about next steps. You're also in our talent network, so we'll keep you in mind for other roles that fit.`
    : candidate
    ? "You're now in our talent network. Your details are with our team, and we'll reach out when a task force assignment or permanent role fits."
    : `Thanks for reaching out about ${about}. Your message is with our team, and a real person will be in touch within one business day.`;
  const next = candidate
    ? step(1, "We review your background", "We look at your experience and the roles you're interested in.") +
      step(2, "We keep you in mind", "When a task force assignment or permanent role fits, we'll reach out.") +
      (lead.resume
        ? step(3, "Your resume is on file", "We've got it with your details. Reply with an updated version any time.")
        : step(3, "Send your resume", "Reply to this email with your resume attached so it's on file."))
    : staffing
    ? step(1, "We review the role", "We look at the property, the position and your timing.") +
      step(2, "We reach out", "Within one business day, to talk through the brief.") +
      step(3, "Cover and shortlist", "If the gap can't wait, a task force leader steps in while we find your permanent hire.")
    : step(1, "We review your details", "We look at what you've shared so the first conversation is useful, not generic.") +
      step(2, "We reach out", "Within one business day, by email or phone, to find a time that suits you.") +
      step(3, "Free 1-hour consultation", "We dig into what's going on and you leave knowing whether we can help, even if you never hire us.");
  const book = candidate
    ? ""
    : `<p style="${P};margin-top:10px">Rather not wait? Pick a time ${staffing ? "to talk it through" : "for your consultation"} now.</p>` +
      button({ href: SERVICES[lead.service].booking, label: staffing ? "Book a 30-minute hiring call" : "Book your free 1-hour consultation" });
  return emailShell({
    preheader: lead.job ? "Your application is with our team." : "Your details are with our team. We'll be in touch within one business day.",
    eyebrow: lead.job ? "Application received" : candidate ? "Talent network" : "We've got your details",
    title: `Thank you${first ? `, ${accent(first + ".")}` : "."}`,
    body: `<p style="${P}">${intro}</p>${steps(next)}${book}`,
    note: contactNote,
  });
}
