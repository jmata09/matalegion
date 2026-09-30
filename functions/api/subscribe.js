// POST /api/subscribe — "Stay in the Know" sign-up. Sends a confirmation link only;
// the address is added to the list when the link is clicked (/api/subscribe/confirm).

import { EMAIL_RE, badOrigin, tooLarge } from "../lib/mail.js";
import { sendOptIn, isSubscribed } from "../lib/list.js";

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  const reply = (status, body) =>
    wantsJson
      ? Response.json(body, { status })
      : status === 200
        ? Response.redirect(new URL("/check-inbox", request.url), 303)
        : new Response("Sorry, that didn't work. Please try again later.", { status });

  if (badOrigin(request)) return reply(403, { ok: false, error: "forbidden" });
  if (tooLarge(request)) return reply(413, { ok: false, error: "too_large" });

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: "bad_request" });
  }
  const email = String(form.get("email") || "").trim().toLowerCase().slice(0, 200);

  // Same spam traps as the contact form: a hidden field and a too-fast submit.
  const started = Number(form.get("t") || 0);
  if (form.get("website") || (started && Date.now() - started < 1500)) return reply(200, { ok: true });

  if (!EMAIL_RE.test(email)) return reply(422, { ok: false, error: "invalid_email" });

  try {
    // Already on the list: nothing to send (and nothing to reveal to whoever typed it).
    if (await isSubscribed(env, email).catch(() => false)) return reply(200, { ok: true });
    await sendOptIn(env, email);
  } catch (err) {
    console.error("optin_failed", err.message);
    return reply(502, { ok: false, error: "send_failed" });
  }
  return reply(200, { ok: true });
}
