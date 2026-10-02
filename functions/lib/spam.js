// Spam defences shared by the site's forms. Bots are answered as if everything worked
// (so they learn nothing) but nothing is sent or saved.

// Every form gets a hidden "t" (page load time) from site.js. A missing, too-recent or
// week-old value means the post didn't come from someone using the page.
export function badTiming(form, minMs = 3000) {
  const started = Number(form.get("t"));
  if (!Number.isFinite(started) || started <= 0) return "no_timestamp";
  const age = Date.now() - started;
  if (age < minMs) return "too_fast";
  if (age > 7 * 24 * 3600 * 1000) return "stale";
  return "";
}

// At most `limit` posts per visitor IP and form in `windowSec`, counted in Cloudflare's
// cache (per data centre, which is plenty against one bot hammering a form).
export async function rateLimited(request, name, limit = 3, windowSec = 600) {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip || typeof caches === "undefined") return false;
  const key = new Request(`https://rate-limit.thematalegion.internal/${name}/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  const hit = await cache.match(key).catch(() => null);
  const count = hit ? Number(await hit.text()) || 0 : 0;
  if (count >= limit) return true;
  await cache
    .put(key, new Response(String(count + 1), { headers: { "Cache-Control": `max-age=${windowSec}` } }))
    .catch(() => {});
  return false;
}

const CYRILLIC = /[Ѐ-ӿ]/;

// Signatures of known form-spam scripts: names like "RobertJeK" (a first name with random
// capitals glued on) and the "I'd like to know your price" message in Cyrillic.
export function knownBot(lead) {
  const name = String(lead.name || "");
  const message = String(lead.message || "");
  if (/^[A-Z][a-z]{2,}[A-Z][a-z]?[A-Z]$/.test(name)) return "bot_name";
  if (CYRILLIC.test(message) && /(прайс|цен|стоимост|price)/i.test(message)) return "price_spam";
  return "";
}

// Probably spam but could be a person: still delivered (marked) so no real lead is lost,
// but no confirmation email goes to an address that might not be theirs.
export function looksSuspicious(lead) {
  const text = `${lead.name || ""} ${lead.company || ""} ${lead.message || ""}`;
  if (CYRILLIC.test(text)) return "cyrillic";
  if ((String(lead.message || "").match(/https?:\/\//g) || []).length >= 2) return "links";
  if (/^(google|yandex|facebook|test|n\/?a|none)$/i.test(String(lead.company || "").trim())) return "fake_company";
  return "";
}

// Cloudflare Turnstile: the widget in each form adds "cf-turnstile-response"; Cloudflare
// confirms it came from a person on our site. Returns "" when it passes, or a reason.
// Skipped while TURNSTILE_SECRET_KEY isn't set, so the forms keep working without it.
export async function failsTurnstile(env, form, request) {
  if (!env.TURNSTILE_SECRET_KEY) return "";
  const token = String(form.get("cf-turnstile-response") || "");
  if (!token) return "no_token";
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: request.headers.get("cf-connecting-ip") || "",
      }),
    });
    const out = await res.json();
    return out.success ? "" : `turnstile_${(out["error-codes"] || []).join(",") || "failed"}`;
  } catch (err) {
    // If Cloudflare can't be reached, don't lose a real lead; the other traps still apply.
    console.error("turnstile_unreachable", err.message);
    return "";
  }
}
