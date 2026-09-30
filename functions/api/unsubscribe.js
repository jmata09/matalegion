// /api/unsubscribe
//   GET  ?e=…&s=…        link in our emails: shows an "Unsubscribe" button (scanners
//                        open links but don't press buttons, so nobody is removed by accident)
//   POST e, s (signed)   the button: unsubscribes at once
//   POST email           the /unsubscribe page form: emails that address a signed link,
//                        so nobody can unsubscribe someone else

import { EMAIL_RE, badOrigin, tooLarge, verifySigned } from "../lib/mail.js";
import { removeSubscriber, sendUnsubscribeLink } from "../lib/list.js";
import { page } from "../lib/page.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = await verifySigned(env, url.searchParams, "unsubscribe").catch(() => null);
  if (!email) return Response.redirect(new URL("/unsubscribe", url), 303);
  return page({
    title: "Unsubscribe",
    eyebrow: "Unsubscribe",
    heading: 'Stop getting <span class="hl">our emails?</span>',
    text: "Press the button and we'll take you off the list straight away.",
    form: {
      action: "/api/unsubscribe",
      fields: { e: email, x: url.searchParams.get("x") || "0", s: url.searchParams.get("s") || "" },
      button: "Unsubscribe Me",
    },
  });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  const reply = (status, body) =>
    wantsJson
      ? Response.json(body, { status })
      : status === 200
        ? Response.redirect(new URL("/check-inbox?for=unsubscribe", url), 303)
        : new Response("Sorry, that didn't work. Please email info.desk@matalegion.com.", { status });

  if (badOrigin(request)) return reply(403, { ok: false, error: "forbidden" });
  if (tooLarge(request)) return reply(413, { ok: false, error: "too_large" });
  const form = await request.formData().catch(() => null);
  if (!form) return reply(400, { ok: false, error: "bad_request" });

  // The button on the page above: a signed request, act on it.
  if (form.get("s")) {
    const email = await verifySigned(env, form, "unsubscribe").catch(() => null);
    if (!email) return Response.redirect(new URL("/unsubscribe", url), 303);
    try {
      await removeSubscriber(env, email);
    } catch (err) {
      console.error("unsubscribe_failed", err.message);
      return new Response("Sorry, we couldn't unsubscribe you right now. Please try again, or email info.desk@matalegion.com.", { status: 502 });
    }
    return Response.redirect(new URL("/unsubscribed", url), 303);
  }

  // The /unsubscribe page: email a signed link to the address given.
  const email = String(form.get("email") || "").trim().toLowerCase().slice(0, 200);
  if (form.get("website")) return reply(200, { ok: true });
  if (!EMAIL_RE.test(email)) return reply(422, { ok: false, error: "invalid_email" });
  try {
    await sendUnsubscribeLink(env, email);
  } catch (err) {
    console.error("unsubscribe_link_failed", err.message);
    return reply(502, { ok: false, error: "send_failed" });
  }
  return reply(200, { ok: true });
}
