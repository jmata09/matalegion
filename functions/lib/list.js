// "Stay in the Know" mailing list, kept in Resend Contacts.
//
// Double opt-in: signing up only sends a confirmation link. The address joins the
// list (Resend segment "Stay in the Know") when that link is clicked. Every email
// carries a signed unsubscribe link, and Resend Broadcasts add their own.
//
// Settings: RESEND_API_KEY (required for the list), RESEND_SEGMENT_ID (optional:
// otherwise the segment is found or created by name), SUBSCRIBE_SECRET (optional
// signing key; defaults to the Resend key).

import { DEFAULT_MAILBOX, PUBLIC_EMAIL, SITE, send, esc, signedUrl } from "./mail.js";
import { emailShell, button, P, LINK } from "./email-layout.js";

const SEGMENT_NAME = "Stay in the Know";
const CONFIRM_DAYS = 7;

async function resend(env, method, path, body) {
  if (!env.RESEND_API_KEY) throw new Error("resend_not_configured");
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

let segmentId = null;
async function getSegmentId(env) {
  if (env.RESEND_SEGMENT_ID) return env.RESEND_SEGMENT_ID;
  if (segmentId) return segmentId;
  const list = await resend(env, "GET", "/segments");
  const found = (list.data?.data || []).find((s) => s.name === SEGMENT_NAME);
  if (found) return (segmentId = found.id);
  const created = await resend(env, "POST", "/segments", { name: SEGMENT_NAME });
  if (!created.ok || !created.data?.id) throw new Error(`segment_create_${created.status}`);
  return (segmentId = created.data.id);
}

// True when the address is already on the list and hasn't unsubscribed.
export async function isSubscribed(env, email) {
  const res = await resend(env, "GET", `/contacts/${encodeURIComponent(email)}`);
  return res.ok && res.data?.unsubscribed === false;
}

// Adds (or re-subscribes) the address. Returns false when it was already subscribed,
// so callers can skip the welcome and "new subscriber" emails.
export async function addSubscriber(env, email, firstName) {
  const segment = await getSegmentId(env);
  const id = encodeURIComponent(email);
  if (await isSubscribed(env, email)) {
    await resend(env, "POST", `/contacts/${id}/segments/${segment}`); // make sure it's in the list; harmless if it already is
    return false;
  }
  const created = await resend(env, "POST", "/contacts", {
    email,
    first_name: firstName || undefined,
    unsubscribed: false,
    segments: [{ id: segment }],
  });
  if (created.ok) return true;
  // Already a contact who had unsubscribed (or isn't in the list yet): switch them back on.
  const updated = await resend(env, "PATCH", `/contacts/${id}`, { unsubscribed: false });
  if (!updated.ok) throw new Error(`contact_update_${updated.status}`);
  await resend(env, "POST", `/contacts/${id}/segments/${segment}`);
  return true;
}

export async function removeSubscriber(env, email) {
  const res = await resend(env, "PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true });
  if (!res.ok && res.status !== 404) throw new Error(`contact_unsubscribe_${res.status}`);
}

export const unsubscribeUrl = (env, email) => signedUrl(env, "/api/unsubscribe", "unsubscribe", email);

export async function sendOptIn(env, email) {
  const expires = Math.floor(Date.now() / 1000) + CONFIRM_DAYS * 86400;
  const confirm = await signedUrl(env, "/api/subscribe/confirm", "subscribe", email, expires);
  await send(env, env.MAIL_FROM || DEFAULT_MAILBOX, {
    to: email,
    replyTo: PUBLIC_EMAIL,
    subject: "Confirm your subscription — The Matalegion Group",
    html: shell({
      preheader: "One click to confirm you want to stay in the know.",
      eyebrow: "Stay in the know",
      title: "Confirm your subscription",
      body: `<p style="${P}">You asked to get insights from The Matalegion Group on hotel and restaurant turnarounds, renovations and service. Please confirm it was you.</p>`,
      button: { href: confirm, label: "Yes, subscribe me" },
      footer: `If you didn't ask for this, ignore this email and you won't be added. This link expires in ${CONFIRM_DAYS} days.`,
    }),
  });
}

export async function sendWelcome(env, email) {
  const unsub = await unsubscribeUrl(env, email);
  await send(env, env.MAIL_FROM || DEFAULT_MAILBOX, {
    to: email,
    replyTo: PUBLIC_EMAIL,
    subject: "You're in — The Matalegion Group",
    html: shell({
      preheader: "You're subscribed. Here's what to expect.",
      eyebrow: "You're subscribed",
      title: "Welcome to Stay in the Know",
      body: `<p style="${P}">You'll get practical insights from operators: what's driving guest scores, how to get through a PIP or renovation without losing revenue, and what's working in hotels and restaurants right now. No spam, and we never share your address.</p>
<p style="${P}">Have a property that needs help now? Reply to this email or book a free 1-hour consultation.</p>`,
      button: { href: `${SITE}/contact`, label: "Talk to us" },
      footer: `Changed your mind? <a href="${unsub}" style="${LINK}">Unsubscribe</a> at any time.`,
    }),
  });
}

export async function sendUnsubscribeLink(env, email) {
  const unsub = await unsubscribeUrl(env, email);
  await send(env, env.MAIL_FROM || DEFAULT_MAILBOX, {
    to: email,
    replyTo: PUBLIC_EMAIL,
    subject: "Unsubscribe from The Matalegion Group",
    html: shell({
      preheader: "Confirm you want to stop receiving our emails.",
      eyebrow: "Unsubscribe",
      title: "Confirm you want to unsubscribe",
      body: `<p style="${P}">Click below and we'll stop sending you our emails straight away.</p>`,
      button: { href: unsub, label: "Unsubscribe me" },
      footer: "If you didn't ask for this, ignore this email and nothing will change.",
    }),
  });
}

export async function notifyNewSubscriber(env, email, source) {
  await send(env, env.MAIL_FROM || DEFAULT_MAILBOX, {
    to: env.LEAD_TO || PUBLIC_EMAIL,
    replyTo: email,
    subject: `New subscriber: ${email}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
<p><strong>${esc(email)}</strong> confirmed their subscription to Stay in the Know${source ? ` (signed up from ${esc(source)})` : ""}.</p>
<p style="color:#666">They're in the "${SEGMENT_NAME}" segment in Resend.</p></div>`,
  });
}

// Mailing-list emails use the site's shared branded layout, with one call-to-action button.
function shell({ preheader, eyebrow, title, body, button: cta, footer }) {
  return emailShell({ preheader, eyebrow, title, body: body + button(cta), note: footer });
}
