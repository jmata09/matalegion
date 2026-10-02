// The branded email shell used by every email visitors receive (confirmations, mailing
// list). Matches the website: forest green, cream and lime, the monoline M, a serif
// headline. Email apps ignore most CSS, so everything is inline and table-based; the
// serif falls back to Georgia where web fonts can't load (Gmail, Outlook).

import { SITE } from "./mail.js";

export const C = { green: "#173A2B", cream: "#F7F1DE", lime: "#C8E86A", paper: "#FFFDF7", page: "#EFE9D6", text: "#38463E", muted: "#6B766E", rule: "#E6E0CC", label: "#4D6B33" };
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";
const WIDE = "'Jost','Century Gothic',Futura,Arial,sans-serif";

export const P = `margin:0 0 18px;font:16px/1.65 ${SANS};color:${C.text}`;
export const LINK = `color:${C.green};font-weight:bold;text-decoration:underline`;

// Numbered "what happens next" step.
export const step = (n, title, text) => `<tr>
<td valign="top" style="padding:0 16px 18px 0;width:32px"><div style="width:30px;height:30px;border-radius:15px;background:${C.green};color:${C.cream};font:500 15px/30px ${SERIF};text-align:center">${n}</div></td>
<td valign="top" style="padding:3px 0 18px;font:15px/1.55 ${SANS};color:${C.text}"><strong style="color:${C.green}">${title}</strong><br>${text}</td></tr>`;
export const steps = (rows) => `<p style="margin:8px 0 14px;font:600 20px/1.2 ${SERIF};color:${C.green}">What happens next</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>`;

export const button = ({ href, label }) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px"><tr><td style="background:${C.lime};border-radius:999px">
<a href="${href}" style="display:inline-block;padding:15px 28px;font:bold 15px ${SANS};color:${C.green};text-decoration:none">${label} &rarr;</a>
</td></tr></table>`;

// preheader: inbox preview text; eyebrow: small label; title: may contain <em> for the
// lime-italic accent like the website; body: HTML; note: small print above the footer.
export function emailShell({ preheader, eyebrow, title, body, note }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@400&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.paper};border-radius:16px;overflow:hidden">
<tr><td style="background:${C.green};padding:24px 34px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="width:40px"><a href="${SITE}"><img src="${SITE}/email/mark.png" width="40" height="40" alt="Matalegion" style="display:block;border:0;width:40px;height:40px"></a></td>
  <td style="padding-left:14px;font:400 15px ${WIDE};letter-spacing:.32em;color:${C.cream}">MATALEGION</td>
  </tr></table>
</td></tr>
<tr><td style="padding:38px 34px 8px">
  <p style="margin:0 0 10px;font:bold 11px ${SANS};letter-spacing:.2em;color:${C.label};text-transform:uppercase">${eyebrow}</p>
  <h1 style="margin:0 0 18px;font:500 34px/1.12 ${SERIF};color:${C.green}">${title}</h1>
  ${body}
</td></tr>
<tr><td style="padding:22px 34px 26px;border-top:1px solid ${C.rule};font:14px/1.6 ${SANS};color:${C.muted}">${note}</td></tr>
<tr><td style="background:${C.green};padding:24px 34px;font:13px/1.65 ${SANS};color:#C2C9B8">
  <span style="font:600 18px ${SERIF};color:${C.cream}">The Matalegion Group</span><br>
  Turnarounds, task force and staffing, renovations and portfolio programs for hotels and restaurants worldwide.<br>
  <a href="${SITE}" style="color:${C.lime};text-decoration:none">thematalegion.com</a> &nbsp;·&nbsp; Matalegion Inc., Las Vegas, NV
</td></tr>
</table>
</td></tr></table></body></html>`;
}

// Lime-italic accent words in a headline, like the website (darker green-lime on paper for contrast).
export const accent = (text) => `<em style="font-style:italic;color:${C.label}">${text}</em>`;

// "Questions? Reply or reach us" line used under most emails.
export const contactNote = `Questions in the meantime? Just reply to this email, or reach us at <a href="mailto:info.desk@matalegion.com" style="${LINK}">info.desk@matalegion.com</a> or <a href="tel:+17028187003" style="${LINK}">+1 702.818.7003</a>.`;
