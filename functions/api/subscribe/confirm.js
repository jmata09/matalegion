// /api/subscribe/confirm?e=…&x=…&s=… — the link in the confirmation email.
//
// GET only shows a "Confirm subscription" button; POST (the button) does the work.
// Email security scanners open links, sometimes several times, but don't press
// buttons, so only a real click subscribes. Repeat clicks send nothing new.

import { badOrigin, verifySigned } from "../../lib/mail.js";
import { addSubscriber, sendWelcome, notifyNewSubscriber } from "../../lib/list.js";
import { page } from "../../lib/page.js";

const expired = (url) => Response.redirect(new URL("/subscribe-expired", url), 303);

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = await verifySigned(env, url.searchParams, "subscribe").catch(() => null);
  if (!email) return expired(url);
  return page({
    title: "Confirm your subscription",
    eyebrow: "Stay in the know",
    heading: 'One click to <span class="hl">confirm.</span>',
    text: "Press the button to start getting insights from The Matalegion Group. You can unsubscribe any time.",
    form: {
      action: "/api/subscribe/confirm",
      fields: { e: email, x: url.searchParams.get("x") || "0", s: url.searchParams.get("s") || "" },
      button: "Confirm Subscription",
    },
  });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (badOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData().catch(() => null);
  const email = form && (await verifySigned(env, form, "subscribe").catch(() => null));
  if (!email) return expired(url);

  let isNew;
  try {
    isNew = await addSubscriber(env, email);
  } catch (err) {
    console.error("subscribe_failed", err.message);
    return new Response("Sorry, we couldn't confirm your subscription right now. Please try the link again later.", { status: 502 });
  }
  if (isNew) {
    await sendWelcome(env, email).catch((err) => console.error("welcome_failed", err.message));
    await notifyNewSubscriber(env, email).catch((err) => console.error("notify_failed", err.message));
  }
  return Response.redirect(new URL("/subscribed", url), 303);
}
