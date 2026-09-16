# Charlie's Call to Action

Landing page for charliescalltoaction.org.

`index.html` is the whole site — one file, no build step, no dependencies.
Edit it in any text editor and push; that's the entire workflow.

## Putting it online

In the Cloudflare dashboard:

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick `jmata09/matalegion`
3. Framework preset: **None** · Build command: **leave empty** · Output directory: **leave empty**
4. **Save and Deploy**

That gives you a live `*.pages.dev` URL in about a minute.

## Adding the domain

Only after the site is live and looks right:

1. Cloudflare → **Add a domain** → `charliescalltoaction.org` → Free plan
2. Cloudflare gives you two nameservers — set those at your registrar
3. Wait for the domain to show **Active** (minutes, sometimes longer)
4. In the Pages project → **Custom domains** → add `charliescalltoaction.org` and `www.charliescalltoaction.org`

## Still to fill in

- EIN in the footer
- A real inbox for `info@charliescalltoaction.org` (Cloudflare → Email → Email Routing, free)
