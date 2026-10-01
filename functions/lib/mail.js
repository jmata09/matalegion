// Shared helpers for the site's Pages Functions: sending email, escaping, signed links.
//
// Email goes through Microsoft 365 (Graph sendMail) when GRAPH_* settings exist,
// otherwise through Resend.

export const DEFAULT_MAILBOX = "TheMatalegionGroup@Matalegion.com";
export const PUBLIC_EMAIL = "info.desk@matalegion.com";
export const SITE = "https://thematalegion.com";

// Only accept submissions sent from our own pages.
const ALLOWED_ORIGIN = /^https:\/\/((www\.)?thematalegion\.com|([a-z0-9-]+\.)?thematalegion\.pages\.dev)$/;
export const MAX_BODY_BYTES = 32 * 1024;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function badOrigin(request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && !ALLOWED_ORIGIN.test(origin));
}

export function tooLarge(request, max = MAX_BODY_BYTES) {
  return Number(request.headers.get("content-length") || 0) > max;
}

// msg: { to, replyTo, subject, html, attachments?: [{ name, type, base64 }] }
export async function send(env, from, msg) {
  const graph = env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET;
  if (graph) {
    try {
      return await sendWithGraph(env, from, msg);
    } catch (err) {
      // Microsoft 365 first; if it fails (missing permission, expired secret), don't lose the email.
      if (!env.RESEND_API_KEY) throw err;
      console.error("graph_send_failed_falling_back_to_resend", err.message);
    }
  }
  if (env.RESEND_API_KEY) {
    return sendWithResend(env, msg);
  }
  throw new Error("no_mail_provider_configured");
}

export async function sendWithGraph(env, from, { to, replyTo, subject, html, attachments = [] }) {
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
        attachments: attachments.map((a) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: a.name,
          contentType: a.type,
          contentBytes: a.base64,
        })),
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) throw new Error(`graph_sendmail_${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function sendWithResend(env, { to, replyTo, subject, html, attachments = [] }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.RESEND_FROM || "The Matalegion Group <noreply@thematalegion.com>",
      to: [to],
      reply_to: replyTo,
      subject,
      html,
      attachments: attachments.map((a) => ({ filename: a.name, content: a.base64 })),
    }),
  });
  if (!res.ok) throw new Error(`resend_${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Signed links (confirm / unsubscribe) so only the owner of an inbox can act on it.
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(env, text) {
  const secret = env.SUBSCRIBE_SECRET || env.RESEND_API_KEY || env.GRAPH_CLIENT_SECRET;
  if (!secret) throw new Error("no_signing_secret");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}

// expiresAt: unix seconds, or 0 for a link that never expires.
export async function signedUrl(env, path, action, email, expiresAt = 0) {
  const e = email.toLowerCase();
  const s = await hmac(env, `${action}:${e}:${expiresAt}`);
  return `${SITE}${path}?e=${encodeURIComponent(e)}&x=${expiresAt}&s=${s}`;
}

// params: anything with .get() (URL search params or submitted form data).
export async function verifySigned(env, params, action) {
  const e = String(params.get("e") || "").toLowerCase();
  const x = Number(params.get("x") || "0");
  const s = String(params.get("s") || "");
  if (!EMAIL_RE.test(e) || !s) return null;
  if (x && x < Date.now() / 1000) return null;
  const expected = await hmac(env, `${action}:${e}:${x}`);
  if (expected.length !== s.length) return null;
  let diff = 0;
  for (let i = 0; i < s.length; i++) diff |= expected.charCodeAt(i) ^ s.charCodeAt(i);
  return diff === 0 ? e : null;
}
