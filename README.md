# The Matalegion Group — thematalegion.com

Public website for The Matalegion Group: hospitality service coaching and task force leadership for hotels.

Plain HTML and CSS. No build step and no dependencies. Edit a file, push, and Cloudflare publishes it.

## What's in here

| File | Page |
|---|---|
| `index.html` | Home (`/`) |
| `how-we-help.html` | How We Help (`/how-we-help`) |
| `who-we-are.html` | Who We Are (`/who-we-are`) |
| `contact.html` | Contact (`/contact`) |
| `404.html` | Shown for any address that doesn't exist |
| `styles.css` | Colors, fonts and layout for every page |
| `favicon.svg` | Browser tab icon |
| `_redirects` | Sends old addresses (`/services`, `/our-legacy`, `/portal`, …) to the right page |

The header and footer are copied into each page. If you change a menu item, phone number or email address, change it in **all four pages** (search the folder for the old text).

## Links to keep current

- **Schedule a Call** buttons go to the Microsoft Bookings "Fit Call" page:
  `https://outlook.office.com/book/TheMatalegionGroup@Matalegion.com/s/oZgN-DdUXUK05wCIOp6VGA2?ismsaljsauthenabled`
- Email: `TheMatalegionGroup@Matalegion.com` · Phone: `+1 702.818.7003`

## Putting it online (Cloudflare Pages)

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick `jmata09/matalegion`, production branch `main`
3. Framework preset **None** · Build command **empty** · Output directory **empty**
4. **Save and Deploy**. You get a `*.pages.dev` preview address.

## Moving thematalegion.com to this site

The domain currently points at the older Worker `thematalegion-com`. Do this **only after** the preview looks right:

1. Workers & Pages → `thematalegion-com` → **Settings → Domains & Routes** → remove `thematalegion.com` and `www.thematalegion.com`
2. Pages project → **Custom domains** → add `thematalegion.com` and `www.thematalegion.com`

Don't delete the old Worker. It holds the previous admin/CRM/portal code, which is useful reference for the back office rebuild. To roll back, swap the domains the other way.
