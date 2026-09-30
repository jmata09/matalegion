// GET  /api/unsubscribe?e=…&s=… — signed link from our emails: unsubscribes at once.
// POST /api/unsubscribe (email)  — from the /unsubscribe page: emails that address a
//                                  signed link, so nobody can unsubscribe someone else.

import { EMAIL_RE, badOrigin, tooLarge, verifySigned } from "../lib/mail.js";
import { removeSubscriber, sendUnsubscribeLink } from "../lib/list.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = await verifySigned(env, url, "unsubscribe").catch(() => null);
  if (!email) return Response.redirect(new URL("/unsubscribe", url), 303);
  try {
    await removeSubscriber(env, email);
  } catch (err) {
    console.error("unsubscribe_failed", err.message);
    return new Response("Sorry, we couldn't unsubscribe you right now. Please try the link again, or email info.desk@matalegion.com.", { status: 502 });
  }
  return Response.redirect(new URL("/unsubscribed", url), 303);
}

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  const reply = (status, body) =>
    wantsJson
      ? Response.json(body, { status })
      : status === 200
        ? Response.redirect(new URL("/check-inbox?for=unsubscribe", request.url), 303)
        : new Response("Sorry, that didn't work. Please email info.desk@matalegion.com.", { status });

  if (badOrigin(request)) return reply(403, { ok: false, error: "forbidden" });
  if (tooLarge(request)) return reply(413, { ok: false, error: "too_large" });

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: "bad_request" });
  }
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
