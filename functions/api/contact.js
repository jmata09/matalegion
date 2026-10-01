// POST /api/contact — contact form handler (Cloudflare Pages Function).
//
// Sends the lead to the team mailbox, and a short confirmation to the
// visitor, through Microsoft 365 (Graph sendMail). Falls back to Resend
// only if Microsoft 365 isn't configured.
//
// Settings (Cloudflare Pages project > Settings > Variables and Secrets):
//   GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET  Entra app with Mail.Send (application)
//   MAIL_FROM   mailbox the app sends as     (default TheMatalegionGroup@Matalegion.com)
//   LEAD_TO     where new leads are delivered (default info.desk@matalegion.com,
//               an M365 alias on j.mata@)
//   RESEND_API_KEY, RESEND_FROM                optional fallback

import { DEFAULT_MAILBOX, PUBLIC_EMAIL, EMAIL_RE, badOrigin, tooLarge, send, esc } from "../lib/mail.js";
import { sendOptIn, isSubscribed } from "../lib/list.js";

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
    booking: booking("oZgN-DdUXUK05wCIOp6VGA2"),
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
const RESUME_MAX = 3 * 1024 * 1024;
const RESUME_TYPES = {
  pdf: ["application/pdf", [0x25, 0x50, 0x44, 0x46]],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [0x50, 0x4b, 0x03, 0x04]],
  doc: ["application/msword", [0xd0, 0xcf, 0x11, 0xe0]],
};
const COMMON = { name: ["Name", 120, true], email: ["Email", 200, true], phone: ["Phone", 40], company: ["Hotel, restaurant or company", 160, true] };

export async function onRequestPost({ request, env }) {
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
  for (const [name, [, max, , allowed]] of Object.entries(fields)) {
    const value = form.getAll(name).map((v) => String(v).trim()).find(Boolean) || "";
    lead[name] = allowed && !allowed.includes(value) ? "" : value.slice(0, max);
  }
  if (lead.link && !/^https?:\/\/\S+$/i.test(lead.link)) lead.link = "";

  // Spam traps: a hidden field people never see, and submissions faster than a human can type.
  const started = Number(form.get("t") || 0);
  if (form.get("website") || (started && Date.now() - started < 2500)) {
    return reply(200, { ok: true });
  }

  const missing = Object.entries(fields).some(([name, [, , required]]) => required && !lead[name]);
  if (missing || !EMAIL_RE.test(lead.email)) return reply(422, { ok: false, error: "missing_fields" });

  const resume = candidate ? await readResume(form.get("resume")) : null;
  if (resume?.error) return reply(422, { ok: false, error: resume.error });
  lead.resume = resume?.name || "";

  const from = env.MAIL_FROM || DEFAULT_MAILBOX;
  const to = env.LEAD_TO || PUBLIC_EMAIL;
  const notice = {
    to,
    replyTo: lead.email,
    subject: candidate
      ? `New candidate: ${lead.name} (${lead.position})`
      : service === "staffing"
        ? `Staffing request: ${lead.position} at ${lead.company}`
        : `New lead (${SERVICES[service].name}): ${lead.company} (${lead.name})`,
    html: leadHtml(lead, fields, request),
    attachments: resume ? [resume] : [],
  };
  const confirmation = {
    to: lead.email,
    replyTo: to,
    subject: candidate ? "You're in our talent network — The Matalegion Group" : "We've got your details — The Matalegion Group",
    html: confirmationHtml(lead),
  };

  try {
    await send(env, from, notice);
  } catch (err) {
    console.error("lead_send_failed", err.message);
    return reply(502, { ok: false, error: "send_failed" });
  }
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
  const step = (n, title, text) => `<tr>
<td valign="top" style="padding:0 14px 16px 0;width:30px"><div style="width:28px;height:28px;border-radius:14px;background:#C8F35A;color:#0A0B0A;font:800 13px/28px Arial,sans-serif;text-align:center">${n}</div></td>
<td valign="top" style="padding:0 0 16px;font:15px/1.5 Arial,sans-serif;color:#333"><strong style="color:#0A0B0A">${title}</strong><br>${text}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F2F2EF">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your details are with our team. We'll be in touch within one business day.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2EF"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0A0B0A;padding:22px 32px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="width:34px;height:34px;background:#C8F35A;border-radius:9px;text-align:center;font:900 19px/34px Arial,sans-serif;color:#0A0B0A">M</td>
  <td style="padding-left:12px;font:900 17px Arial,sans-serif;letter-spacing:.06em;color:#ffffff">MATALEGION</td>
  </tr></table>
</td></tr>
<tr><td style="padding:34px 32px 8px">
  <p style="margin:0 0 6px;font:700 12px Arial,sans-serif;letter-spacing:.14em;color:#6B8F12;text-transform:uppercase">We've got your details</p>
  <h1 style="margin:0 0 16px;font:900 28px/1.15 Arial,sans-serif;color:#0A0B0A">Thanks${first ? `, ${first}` : ""}.</h1>
  <p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#333">${candidate ? "You're now in our talent network. Your details are with our team, and we'll reach out when a task force assignment or permanent role fits." : `Thanks for reaching out about ${about}. Your message is with our team, and a real person will be in touch within one business day.`}</p>
  <p style="margin:0 0 14px;font:800 15px Arial,sans-serif;color:#0A0B0A">What happens next</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  ${candidate
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
      step(3, "Free 1-hour consultation", "We dig into what's going on and you leave knowing whether we can help, even if you never hire us.")}
  </table>
</td></tr>
${candidate ? "" : `<tr><td style="padding:8px 32px 30px">
  <p style="margin:0 0 14px;font:15px/1.5 Arial,sans-serif;color:#333">Rather not wait? Pick a time ${staffing ? "to talk it through" : "for your consultation"} now.</p>
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#C8F35A;border-radius:999px">
  <a href="${SERVICES[lead.service].booking}" style="display:inline-block;padding:14px 26px;font:800 15px Arial,sans-serif;color:#0A0B0A;text-decoration:none">${staffing ? "Book a 30-minute hiring call" : "Book your free 1-hour consultation"} &rarr;</a>
  </td></tr>`}</table>
</td></tr>
<tr><td style="padding:22px 32px;border-top:1px solid #ECECE8;font:14px/1.6 Arial,sans-serif;color:#555">
  Questions in the meantime? Just reply to this email, or reach us at
  <a href="mailto:info.desk@matalegion.com" style="color:#0A0B0A;font-weight:bold">info.desk@matalegion.com</a> or
  <a href="tel:+17028187003" style="color:#0A0B0A;font-weight:bold">+1 702.818.7003</a>.
</td></tr>
<tr><td style="background:#0A0B0A;padding:20px 32px;font:13px/1.6 Arial,sans-serif;color:#A8A8A0">
  <strong style="color:#ffffff">The Matalegion Group</strong><br>
  Turnarounds, renovations and PIPs, menu redesign, leadership training and staffing for hotels and restaurants worldwide.<br>
  <a href="https://thematalegion.com" style="color:#C8F35A;text-decoration:none">thematalegion.com</a> &nbsp;·&nbsp; <span style="color:#C8F35A">Operators first. Coaches by craft.</span>
</td></tr>
</table>
</td></tr></table></body></html>`;
}
