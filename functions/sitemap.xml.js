// GET /sitemap.xml — the site's pages plus every open role (so new roles reach Google's
// job search without editing a file by hand).

import { SITE } from "./lib/mail.js";
import { openRoles } from "./lib/jobs.js";

const PAGES = [
  ["/", "weekly", "1.0"],
  ["/services", "monthly", "0.9"],
  ["/staffing", "monthly", "0.9"],
  ["/jobs", "daily", "0.9"],
  ["/about", "monthly", "0.7"],
  ["/contact", "monthly", "0.8"],
  ["/privacy", "yearly", "0.2"],
  ["/terms", "yearly", "0.2"],
];

export function onRequestGet() {
  const urls = [
    ...PAGES.map(([path, freq, pri]) => `  <url><loc>${SITE}${path}</loc><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`),
    ...openRoles().map(
      (r) => `  <url><loc>${SITE}/jobs/${encodeURIComponent(r.slug)}</loc><lastmod>${r.posted}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    ),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
