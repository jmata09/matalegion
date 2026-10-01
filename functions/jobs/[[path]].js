// GET /jobs and /jobs/<slug> — open roles, rendered into the static jobs.html shell.
//
// Roles live in data/jobs.json (see README: "Adding or closing a role"). Open roles are
// listed and get a page with Google JobPosting markup and the application form; closed
// roles keep their link but say the role is filled (noindex); unknown slugs are a 404.

import { SITE, esc } from "../lib/mail.js";
import { roles, openRoles, place, pay } from "../lib/jobs.js";

const TYPE_SCHEMA = { Permanent: "FULL_TIME", Interim: "TEMPORARY", Contract: "CONTRACTOR" };

const chips = (r) =>
  `<ul class="job-chips"><li>${esc(place(r))}</li><li>${esc(r.type)}</li>${r.pay ? `<li>${esc(pay(r))}</li>` : ""}</ul>`;

const TALENT = `<div class="card job-talent">
  <h3>Don't see your role?</h3>
  <p>Join our talent network and we'll reach out when a task force assignment or permanent role fits.</p>
  <div class="actions" style="margin-top:18px"><a class="btn btn-line" href="/staffing?service=candidate#start">Join the Talent Network</a></div>
</div>`;

function listHtml() {
  const open = openRoles().sort((a, b) => (b.posted || "").localeCompare(a.posted || ""));
  const cards = open.map(
    (r) => `<a class="card job-card" href="/jobs/${esc(r.slug)}">
  <p class="job-client">${esc(r.client)}</p>
  <h3>${esc(r.title)}</h3>
  ${chips(r)}
  <p>${esc(r.summary)}</p>
  <span class="link">View role <span aria-hidden="true">→</span></span>
</a>`,
  );
  const empty = `<p class="lead" style="margin:0 0 28px">There are no open roles right now. New roles are added often.</p>`;
  return `${open.length ? `<div class="job-list">${cards.join("\n")}</div>` : empty}\n${TALENT}`;
}

function detailHtml(r) {
  const list = (items) => `<ul class="legal-list">${(items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  return `<div class="job-detail prose">
  <p><a href="/jobs">← All open roles</a></p>
  ${chips(r)}
  <p class="lead" style="margin-top:22px">${esc(r.summary)}</p>
  ${r.responsibilities?.length ? `<h2>What you'll do</h2>${list(r.responsibilities)}` : ""}
  ${r.requirements?.length ? `<h2>What you'll bring</h2>${list(r.requirements)}` : ""}
  <div class="actions"><a class="btn btn-lime btn-lg" href="#apply">Apply for this role <span class="arrow" aria-hidden="true">→</span></a></div>
  <p class="small muted" style="margin-top:28px">Posted ${esc(fmtDate(r.posted))}. The Matalegion Group and its clients are equal opportunity employers. We consider all qualified applicants without regard to race, colour, religion, sex, sexual orientation, gender identity, national origin, age, disability, veteran status or any other protected characteristic.</p>
</div>`;
}

function filledHtml(r) {
  return `<div class="prose">
  <p class="lead" style="margin:0 0 28px">This ${esc(r.title)} role has been filled. Thank you for your interest.</p>
  <div class="actions" style="margin:0 0 36px"><a class="btn btn-lime" href="/jobs">See open roles <span class="arrow" aria-hidden="true">→</span></a></div>
</div>
${TALENT}`;
}

function fmtDate(iso) {
  return iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
}

function jobPosting(r) {
  const validThrough =
    r.closes || new Date(Date.parse(`${r.posted}T00:00:00Z`) + 60 * 864e5).toISOString().slice(0, 10);
  const description =
    `<p>${esc(r.summary)}</p>` +
    (r.responsibilities?.length ? `<p>What you'll do:</p><ul>${r.responsibilities.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "") +
    (r.requirements?.length ? `<p>What you'll bring:</p><ul>${r.requirements.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "");
  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: r.title,
    description,
    datePosted: r.posted,
    validThrough: `${validThrough}T23:59:59Z`,
    employmentType: TYPE_SCHEMA[r.type] || "OTHER",
    hiringOrganization: { "@type": "Organization", name: "The Matalegion Group", sameAs: SITE, logo: `${SITE}/favicon.svg` },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(r.street ? { streetAddress: r.street } : {}),
        addressLocality: r.city,
        addressRegion: r.region,
        ...(r.postalCode ? { postalCode: r.postalCode } : {}),
        addressCountry: r.country || "US",
      },
    },
    directApply: true,
    url: `${SITE}/jobs/${r.slug}`,
  };
  if (r.pay) {
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: r.pay.currency || "USD",
      value: { "@type": "QuantitativeValue", minValue: r.pay.min, maxValue: r.pay.max || r.pay.min, unitText: (r.pay.period || "year").toUpperCase() },
    };
  }
  // Keep "</script>" out of the JSON so it can't end the tag early.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function onRequestGet({ request, env, params }) {
  const parts = [].concat(params.path || []).filter(Boolean);
  if (parts.length > 1) return notFound(request, env);
  const role = parts.length ? roles.find((r) => r.slug === parts[0]) : null;
  if (parts.length && !role) return notFound(request, env);

  const shell = await env.ASSETS.fetch(new URL("/jobs", request.url));
  const url = role ? `${SITE}/jobs/${role.slug}` : `${SITE}/jobs`;
  const isOpen = role?.status === "open";
  const title = role ? `${role.title}, ${place(role)} | Matalegion Jobs` : null;
  const desc = role ? `${role.type} ${role.title} role in ${place(role)}${role.pay ? `, ${pay(role)}` : ""}. ${role.summary}` : null;

  const set = (selector, fn) => rewriter.on(selector, { element: fn });
  const rewriter = new HTMLRewriter();
  set('link[rel="canonical"]', (el) => el.setAttribute("href", url));
  set('meta[property="og:url"]', (el) => el.setAttribute("content", url));
  set("#jobs-content", (el) => el.setInnerContent(role ? (isOpen ? detailHtml(role) : filledHtml(role)) : listHtml(), { html: true }));

  if (role) {
    set("title", (el) => el.setInnerContent(title));
    set('meta[name="description"]', (el) => el.setAttribute("content", desc));
    set('meta[property="og:title"]', (el) => el.setAttribute("content", title));
    set('meta[property="og:description"]', (el) => el.setAttribute("content", desc));
    set("#jobs-eyebrow", (el) => el.setInnerContent(role.client));
    set("#jobs-title", (el) => el.setInnerContent(`${esc(role.title)}<span class="hl">.</span>`, { html: true }));
    set("#jobs-lead", (el) => el.remove());
  }
  if (isOpen) {
    set("#apply-role", (el) => el.setInnerContent(`${role.title}.`));
    set('input[name="job"]', (el) => el.setAttribute("value", role.slug));
    set('input[name="page"]', (el) => el.setAttribute("value", `/jobs/${role.slug}`));
    set("head", (el) => el.append(`<script type="application/ld+json">${jobPosting(role)}</script>`, { html: true }));
  } else {
    set("#apply", (el) => el.remove());
  }
  if (role && !isOpen) {
    set('meta[name="robots"]', (el) => el.setAttribute("content", "noindex, follow"));
  }

  const res = rewriter.transform(shell);
  return new Response(res.body, { status: 200, headers: res.headers });
}

async function notFound(request, env) {
  const page = await env.ASSETS.fetch(new URL("/404", request.url));
  return new Response(page.body, { status: 404, headers: page.headers });
}
