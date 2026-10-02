// POST /api/subscribe — "Stay in the Know" sign-up. Sends a confirmation link only;
// the address is added to the list when the link is clicked (/api/subscribe/confirm).

import { EMAIL_RE, badOrigin, tooLarge } from "../lib/mail.js";
import { sendOptIn, isSubscribed } from "../lib/list.js";
import { badTiming, rateLimited, failsTurnstile } from "../lib/spam.js";

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

  // Spam traps (functions/lib/spam.js): bots get a normal reply and no email is sent.
  const timing = badTiming(form, 1500);
  if (timing === "no_timestamp" || timing === "stale") return reply(400, { ok: false, error: "bad_request" });
  const turnstile = await failsTurnstile(env, form, request);
  if (turnstile) return (console.log("spam_blocked", turnstile), reply(400, { ok: false, error: "verification_failed" }));
  if (form.get("website") || timing || (await rateLimited(request, "subscribe"))) {
    console.log("spam_dropped", form.get("website") ? "honeypot" : timing || "rate_limit");
    return reply(200, { ok: true });
  }

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
