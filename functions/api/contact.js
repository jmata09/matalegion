// POST /api/contact — contact form handler (Cloudflare Pages Function).
//
// Sends the lead to the team mailbox, and a short confirmation to the
// visitor, through Microsoft 365 (Graph sendMail). Falls back to Resend
// only if Microsoft 365 isn't configured.
//
// Settings (Cloudflare Pages project > Settings > Variables and Secrets):
//   GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET  Entra app with Mail.Send (application)
//   MAIL_FROM   mailbox the app sends as     (default TheMatalegionGroup@Matalegion.com)
//   LEAD_TO     where new leads are delivered (default = MAIL_FROM)
//   RESEND_API_KEY, RESEND_FROM                optional fallback

const DEFAULT_MAILBOX = "TheMatalegionGroup@Matalegion.com";
const BOOKING_URL =
  "https://outlook.office.com/book/TheMatalegionGroup@Matalegion.com/s/oZgN-DdUXUK05wCIOp6VGA2?ismsaljsauthenabled";
const FIELDS = { name: 120, email: 200, phone: 40, company: 160, role: 60, need: 80, message: 4000, page: 100 };

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  const reply = (status, body) =>
    wantsJson
      ? Response.json(body, { status })
      : status === 200
        ? Response.redirect(new URL("/thanks", request.url), 303)
        : new Response("Sorry, that didn't send. Please email " + DEFAULT_MAILBOX, { status });

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

  // Spam traps: a hidden field people never see, and submissions faster than a human can type.
  const started = Number(form.get("t") || 0);
  if (form.get("website") || (started && Date.now() - started < 2500)) {
    return reply(200, { ok: true });
  }

  if (!lead.name || !lead.company || !lead.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return reply(422, { ok: false, error: "missing_fields" });
  }

  const from = env.MAIL_FROM || DEFAULT_MAILBOX;
  const to = env.LEAD_TO || from;
  const notice = {
    to,
    replyTo: lead.email,
    subject: `New lead: ${lead.company} (${lead.name})`,
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

  return reply(200, { ok: true });
}

async function send(env, from, msg) {
  if (env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET) {
    return sendWithGraph(env, from, msg);
  }
  if (env.RESEND_API_KEY) {
    return sendWithResend(env, msg);
  }
  throw new Error("no_mail_provider_configured");
}

async function sendWithGraph(env, from, { to, replyTo, subject, html }) {
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(env.GRAPH_TENANT_ID)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GRAPH_CLIENT_ID,
        client_secret: env.GRAPH_CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      }),
    },
  );
  const token = await tokenRes.json().catch(() => ({}));
  if (!token.access_token) throw new Error(`graph_token_${tokenRes.status}: ${token.error || ""}`);

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
        replyTo: [{ emailAddress: { address: replyTo } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) throw new Error(`graph_sendmail_${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function sendWithResend(env, { to, replyTo, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.RESEND_FROM || "The Matalegion Group <noreply@thematalegion.com>",
      to: [to],
      reply_to: replyTo,
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend_${res.status}: ${(await res.text()).slice(0, 200)}`);
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function leadHtml(lead, request) {
  const rows = [
    ["Name", lead.name],
    ["Email", `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>`, true],
    ["Phone", lead.phone],
    ["Hotel / company", lead.company],
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
  const first = esc(lead.name.split(/\s+/)[0]);
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:560px">
<p>Hi ${first},</p>
<p>Thanks for reaching out about ${esc(lead.company)}. Your details are with our team and we'll be in touch within one business day.</p>
<p>Want to move faster? <a href="${BOOKING_URL}" style="color:#111;font-weight:bold">Book a free 20-minute call here</a>.</p>
<p>— The Matalegion Group<br>+1 702.818.7003 · <a href="https://thematalegion.com" style="color:#111">thematalegion.com</a></p>
<p style="color:#888;font-size:13px">Operators first. Coaches by craft.</p></div>`;
}
