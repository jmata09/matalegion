// GET /api/subscribe/confirm?e=…&x=…&s=… — the link from the confirmation email.
// Adds the address to the list, sends a welcome email and tells the team.

import { verifySigned } from "../../lib/mail.js";
import { addSubscriber, sendWelcome, notifyNewSubscriber } from "../../lib/list.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = await verifySigned(env, url, "subscribe").catch(() => null);
  if (!email) return Response.redirect(new URL("/subscribe-expired", url), 303);

  try {
    await addSubscriber(env, email);
  } catch (err) {
    console.error("subscribe_failed", err.message);
    return new Response("Sorry, we couldn't confirm your subscription right now. Please try the link again later.", { status: 502 });
  }
  await sendWelcome(env, email).catch((err) => console.error("welcome_failed", err.message));
  await notifyNewSubscriber(env, email).catch((err) => console.error("notify_failed", err.message));
  return Response.redirect(new URL("/subscribed", url), 303);
}
