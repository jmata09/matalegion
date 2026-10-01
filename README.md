# The Matalegion Group: thematalegion.com

Marketing site for The Matalegion Group, a hospitality consultancy. Four services for hotels and restaurants: Turnarounds (including F&B and menus, leadership coaching and training); Task Force & Staffing (interim leaders and permanent placement, with its own page at `/staffing` and a candidate talent network); Renovations, PIPs & Openings; and Portfolio Programs.

Five main pages (Home, Services, Staffing, About, Contact). Every page offers **Book a Free Consultation** (one Microsoft Bookings link) and the contact form. The former SEO landing pages redirect to `/services`, or `/staffing` for the old staffing and interim-GM pages. Contact form submissions with "I'm a candidate (talent network)" arrive as **New candidate: …** and get a candidate-specific confirmation.

Plain HTML and CSS, plus one Cloudflare Pages Function for the contact form. No build step.

## Files

| File | What it is |
|---|---|
| `index.html` | Home (long-form sales page) |
| `services.html` | Services (`/services`) |
| `staffing.html` | Task Force & Staffing (`/staffing`), incl. the candidate talent network |
| `about.html` | About (`/about`) |
| `contact.html` | Contact (`/contact`) with booking link and form |
| `thanks.html` | Shown after the form is sent |
| `privacy.html` | Privacy Policy (`/privacy`) |
| `terms.html` | Terms of Use (`/terms`) |
| `jobs.html` | Shell for the Jobs pages; filled in by `functions/jobs/[[path]].js` |
| `data/jobs.json` | Open and closed roles (not published as a file) |
| `functions/sitemap.xml.js` | Generates `/sitemap.xml`, including open roles |
| `404.html` | Page not found |
| `styles.css` | All styling (colors are at the top) |
| `site.js` | Sends the contact form without leaving the page |
| `functions/api/contact.js` | Receives the contact form and emails it |
| `functions/api/subscribe.js`, `functions/api/subscribe/confirm.js` | Stay in the Know sign-up and its confirmation link |
| `functions/api/unsubscribe.js` | Unsubscribe link and the `/unsubscribe` page form |
| `functions/lib/mail.js`, `functions/lib/list.js`, `functions/lib/page.js` | Shared email sending, signed links, the Resend mailing list, and the confirm/unsubscribe button page |
| `check-inbox`, `subscribed`, `subscribe-expired`, `unsubscribe`, `unsubscribed` `.html` | Mailing list pages (not indexed by search engines) |
| `_headers` | Security headers sent with every page (see Security below) |
| `_redirects` | Sends old addresses to the right page |

The header, footer and contact form are repeated in each page. If you change the menu, phone number, email or booking link, search all pages for the old text.

## Publishing

Every push is published by `.github/workflows/deploy.yml` to the Cloudflare Pages project `thematalegion`:

- push to `main` → the live site
- push to any other branch → a preview link (shown in the Actions log)

Needs the GitHub secret `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit).

## Jobs (/jobs)

Roles live in `data/jobs.json`. `/jobs` lists open roles; each role has a page at `/jobs/<slug>` with the application form and Google job-search markup. Applications arrive in info.desk as **"Application: <Role>, <Place> — <Name>"**, with the resume attached, and are saved to OneDrive at `Website Submissions/Job Applications.csv` (resumes in `Resumes/`, named with the role).

**Adding a role**: add an entry to `data/jobs.json` (the `//` notes below are explanations only; JSON files can't contain them), then push to a branch, check the preview link, and merge.

```json
{
  "slug": "general-manager-las-vegas",          // the URL: /jobs/general-manager-las-vegas (never reuse one)
  "status": "open",                              // "open" = listed; "closed" = page says filled, hidden from search
  "title": "General Manager",
  "client": "Luxury boutique hotel (confidential)",   // shown instead of the client's name if confidential
  "city": "Las Vegas", "region": "NV", "country": "US",
  "type": "Permanent",                           // Permanent | Interim | Contract
  "pay": { "min": 140000, "max": 170000, "currency": "USD", "period": "year" },   // required in many states
  "posted": "2026-10-01",
  "closes": "2026-11-30",                        // optional; defaults to 60 days after posted
  "summary": "One or two sentences.",
  "responsibilities": ["…"],
  "requirements": ["…"]
}
```

**Closing a role**: set `"status": "closed"`. Keep the entry so old links say the role was filled rather than "page not found".

## Contact form email (Microsoft 365)

The form sends the lead to your mailbox and a confirmation to the visitor via Microsoft Graph. Add these GitHub secrets. The deploy copies them to Cloudflare:

| Secret | Value |
|---|---|
| `GRAPH_TENANT_ID` | Microsoft Entra tenant ID |
| `GRAPH_CLIENT_ID` | App registration's Application (client) ID |
| `GRAPH_CLIENT_SECRET` | App registration's client secret |
| `MAIL_FROM` | optional. Mailbox to send from (default `TheMatalegionGroup@Matalegion.com`) |
| `LEAD_TO` | optional. Where leads go (default `info.desk@matalegion.com`) |

The app registration needs the Microsoft Graph **application** permission `Mail.Send`, with admin consent.
Until these are set, the form shows visitors your email and phone number instead.

## Mailing list (Stay in the Know)

A sign-up box is in every page's footer, and the contact form has a "Keep me in the know" tick-box.

1. **Sign-up:** the visitor gets a confirmation email (double opt-in). Nothing is saved yet.
2. **Confirm:** the link opens a page with a **Confirm Subscription** button (email security scanners open links but don't press buttons, so only a real click counts). Pressing it adds them to Resend **Audience → Contacts**, in the segment **Stay in the Know**. That segment is created automatically on the first sign-up. They get a welcome email, and you get a "New subscriber" email.
3. **Send newsletters** from Resend → **Broadcasts**, choosing the **Stay in the Know** segment. Resend adds its own unsubscribe link and handles it.
4. **Unsubscribe:** the link in every email opens a page with an **Unsubscribe Me** button, for the same reason. The `/unsubscribe` page emails the person that link, so nobody can remove someone else. It marks the contact as unsubscribed in Resend.

Repeat sign-ups or clicks from someone already on the list send nothing, so there are no duplicate welcome or "New subscriber" emails.

Uses the existing `RESEND_API_KEY` secret. Optional secrets: `RESEND_SEGMENT_ID` (use a segment you created yourself) and `SUBSCRIBE_SECRET` (the key that signs confirm and unsubscribe links; it defaults to the Resend key, so changing that key invalidates old links).

## Domain

In the Pages project `thematalegion` → **Custom domains**, add `thematalegion.com` and `www.thematalegion.com`.

## Security

- `_headers` sends a Content-Security-Policy (only this site, Google Fonts and Cloudflare Web Analytics may load), HSTS, clickjacking protection (`X-Frame-Options: DENY`), `nosniff`, a strict referrer policy and a locked-down permissions policy. If you add a new outside script, font or embed, it must be added to the policy or browsers will block it.
- The contact form only accepts posts from thematalegion.com and its Pages preview addresses, rejects oversized posts, accepts only the listed "What do you need?" values, and never repeats visitor-typed text in the confirmation email, so it can't be used to send spam from your mailbox.
- Recommended in the Cloudflare dashboard: a rate limiting rule on `/api/contact` (Security → WAF → Rate limiting rules), e.g. 5 requests per minute per IP.
