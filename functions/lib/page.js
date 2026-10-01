// A small branded page rendered by a Function: used for the confirm / unsubscribe
// steps, where the link in an email opens a page and the person presses a button.
// (Email security scanners open links but don't press buttons, so only a real click counts.)

import { esc } from "./mail.js";

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
};

// form: { action, fields: {name: value}, button } — omit for a page without a button.
export function page({ title, eyebrow, heading, text, form, status = 200 }) {
  const hidden = form
    ? Object.entries(form.fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join("")
    : "";
  const body = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} — Matalegion</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@800;900&family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/styles.css">
</head><body>
<header class="site-header"><nav class="wrap nav" aria-label="Main"><a class="logo" href="/"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#C8E86A"/><path d="M10 29V11l10 13 10-13v18" fill="none" stroke="#173A2B" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/></svg><span>Matalegion</span></a></nav></header>
<main id="main"><section class="page-head"><div class="wrap">
<p class="eyebrow">${esc(eyebrow)}</p>
<h1>${heading}</h1>
<p class="lead">${text}</p>
${form ? `<form method="post" action="${esc(form.action)}" class="actions">${hidden}<button class="btn btn-lime btn-lg" type="submit">${esc(form.button)}</button></form>` : `<div class="actions"><a class="btn btn-lime btn-lg" href="/">Back to Home</a></div>`}
</div></section></main>
</body></html>`;
  return new Response(body, { status, headers: HEADERS });
}
