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

import { DEFAULT_MAILBOX, PUBLIC_EMAIL, badOrigin, tooLarge, send, esc } from "../lib/mail.js";
import { sendOptIn, isSubscribed } from "../lib/list.js";

const BOOKING_URL =
  "https://bookings.cloud.microsoft/book/TheMatalegionGroup@Matalegion.com/s/oZgN-DdUXUK05wCIOp6VGA2?ismsaljsauthenabled";
// Dedicated Bookings consultation per need (form "What do you need?" value).
// Also the list of accepted values: anything else is recorded as blank.
const BOOKING_BY_NEED = {
  "Turnaround": "https://bookings.cloud.microsoft/book/TheMatalegionGroup@Matalegion.com/s/gFvrMYiozkOG3k69TdE5zg2?ismsaljsauthenabled",
  "Interim / task force leadership": "https://bookings.cloud.microsoft/book/TheMatalegionGroup@Matalegion.com/s/arJF0r5A6EKq2mQZ_bkS_A2?ismsaljsauthenabled",
  "Renovation, PIP or opening": "https://bookings.cloud.microsoft/book/TheMatalegionGroup@Matalegion.com/s/bdcuvxhtrk-cTGIhXJM-1A2?ismsaljsauthenabled",
  "Staffing / permanent placement": "https://bookings.cloud.microsoft/book/TheMatalegionGroup@Matalegion.com/s/arJF0r5A6EKq2mQZ_bkS_A2?ismsaljsauthenabled",
  "I'm a candidate (talent network)": "",
  "Portfolio program (multiple properties)": "https://bookings.cloud.microsoft/book/TheMatalegionGroup@Matalegion.com/s/XUAdwphkc0aUXIA79fdKxA2?ismsaljsauthenabled",
  "Not sure yet": "",
};
const CANDIDATE = "I'm a candidate (talent network)";
const FIELDS = { name: 120, email: 200, phone: 40, company: 160, role: 60, need: 80, message: 4000, page: 100 };

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  const reply = (status, body) =>
    wantsJson
      ? Response.json(body, { status })
      : status === 200
        ? Response.redirect(new URL("/thanks", request.url), 303)
        : new Response("Sorry, that didn't send. Please email " + PUBLIC_EMAIL, { status });

  if (badOrigin(request)) return reply(403, { ok: false, error: "forbidden" });
  if (tooLarge(request)) return reply(413, { ok: false, error: "too_large" });

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: "bad_request" });
  }

  const lead = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    lead[key] = String(form.get(key) || "").trim().slice(0, max);
  }

  if (!(lead.need in BOOKING_BY_NEED)) lead.need = "";

  // Spam traps: a hidden field people never see, and submissions faster than a human can type.
  const started = Number(form.get("t") || 0);
  if (form.get("website") || (started && Date.now() - started < 2500)) {
    return reply(200, { ok: true });
  }

  if (!lead.name || !lead.company || !lead.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return reply(422, { ok: false, error: "missing_fields" });
  }

  const from = env.MAIL_FROM || DEFAULT_MAILBOX;
  const to = env.LEAD_TO || PUBLIC_EMAIL;
  const notice = {
    to,
    replyTo: lead.email,
    subject: lead.need === CANDIDATE ? `New candidate: ${lead.name}` : `New lead: ${lead.company} (${lead.name})`,
    html: leadHtml(lead, request),
  };
  const confirmation = {
    to: lead.email,
    replyTo: to,
    subject: "We've got your details — The Matalegion Group",
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
  if (form.get("newsletter")) {
    const email = lead.email.toLowerCase();
    if (!(await isSubscribed(env, email).catch(() => false))) {
      await sendOptIn(env, email).catch((err) => console.error("optin_failed", err.message));
    }
  }

  return reply(200, { ok: true });
}

function leadHtml(lead, request) {
  const rows = [
    ["Name", lead.name],
    ["Email", `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>`, true],
    ["Phone", lead.phone],
    ["Hotel / restaurant / company", lead.company],
    ["Role", lead.role],
    ["Needs", lead.need],
    ["Sent from", lead.page],
    ["Location", [request.cf?.city, request.cf?.region, request.cf?.country].filter(Boolean).join(", ")],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v, raw]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">${k}</td><td style="padding:6px 0">${raw ? v : esc(v)}</td></tr>`,
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
<h2 style="margin:0 0 12px">New website lead</h2>
<table style="border-collapse:collapse">${rows}</table>
<h3 style="margin:20px 0 8px">Message</h3>
<p style="white-space:pre-wrap;margin:0">${esc(lead.message)}</p>
<p style="margin-top:20px;color:#666">Hit Reply to answer ${esc(lead.name)} directly.</p></div>`;
}

function confirmationHtml(lead) {
  // Only a cleaned-up first name and a value from our own list are repeated back, never free
  // text, so nobody can use this form to send our branded email with their own words in it.
  const first = esc(lead.name.split(/\s+/)[0].replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 30));
  const about = lead.need && lead.need !== "Not sure yet" ? `your ${esc(lead.need.toLowerCase())} enquiry` : "your enquiry";
  const candidate = lead.need === CANDIDATE;
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
  <p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#333">${candidate ? "Thanks for joining our talent network. Your details are with our team, and we'll reach out when a role fits." : `Thanks for reaching out about ${about}. Your message is with our team, and a real person will be in touch within one business day.`}</p>
  <p style="margin:0 0 14px;font:800 15px Arial,sans-serif;color:#0A0B0A">What happens next</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  ${candidate
    ? step(1, "We review your background", "We look at your experience and the roles you're interested in.") +
      step(2, "We keep you in mind", "When a task force assignment or permanent role fits, we'll reach out.") +
      step(3, "Send your resume", "Reply to this email with your resume attached so it's on file.")
    : step(1, "We review your details", "We look at what you've shared so the first conversation is useful, not generic.") +
      step(2, "We reach out", "Within one business day, by email or phone, to find a time that suits you.") +
      step(3, "Free 1-hour consultation", "We dig into what's going on and you leave knowing whether we can help, even if you never hire us.")}
  </table>
</td></tr>
${candidate ? "" : `<tr><td style="padding:8px 32px 30px">
  <p style="margin:0 0 14px;font:15px/1.5 Arial,sans-serif;color:#333">Rather not wait? Pick a time for your consultation now.</p>
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#C8F35A;border-radius:999px">
  <a href="${BOOKING_BY_NEED[lead.need] || BOOKING_URL}" style="display:inline-block;padding:14px 26px;font:800 15px Arial,sans-serif;color:#0A0B0A;text-decoration:none">Book your free 1-hour consultation &rarr;</a>
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
