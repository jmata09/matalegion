# The Matalegion Group: thematalegion.com

Marketing site for The Matalegion Group: hotel service turnarounds, task force leadership and portfolio programs.

Plain HTML and CSS, plus one Cloudflare Pages Function for the contact form. No build step.

## Files

| File | What it is |
|---|---|
| `index.html` | Home (long-form sales page) |
| `services.html` | Services (`/services`) |
| `about.html` | About (`/about`) |
| `contact.html` | Contact (`/contact`) with booking link and form |
| `thanks.html` | Shown after the form is sent |
| `privacy.html` | Privacy note |
| `404.html` | Page not found |
| `styles.css` | All styling (colors are at the top) |
| `site.js` | Sends the contact form without leaving the page |
| `functions/api/contact.js` | Receives the form and emails it through Microsoft 365 |
| `_redirects` | Sends old addresses to the right page |

The header, footer and contact form are repeated in each page. If you change the menu, phone number, email or booking link, search all pages for the old text.

## Publishing

Every push is published by `.github/workflows/deploy.yml` to the Cloudflare Pages project `thematalegion`:

- push to `main` → the live site
- push to any other branch → a preview link (shown in the Actions log)

Needs the GitHub secret `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit).

## Contact form email (Microsoft 365)

The form sends the lead to your mailbox and a confirmation to the visitor via Microsoft Graph. Add these GitHub secrets. The deploy copies them to Cloudflare:

| Secret | Value |
|---|---|
| `GRAPH_TENANT_ID` | Microsoft Entra tenant ID |
| `GRAPH_CLIENT_ID` | App registration's Application (client) ID |
| `GRAPH_CLIENT_SECRET` | App registration's client secret |
| `MAIL_FROM` | optional. Mailbox to send from (default `TheMatalegionGroup@Matalegion.com`) |
| `LEAD_TO` | optional. Where leads go (default = `MAIL_FROM`) |

The app registration needs the Microsoft Graph **application** permission `Mail.Send`, with admin consent.
Until these are set, the form shows visitors your email and phone number instead.

## Domain

In the Pages project `thematalegion` → **Custom domains**, add `thematalegion.com` and `www.thematalegion.com`.
