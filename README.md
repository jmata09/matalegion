# Charlie's Call to Action

Website for **Charlie's Call to Action**, a 501(c)(3) nonprofit that rescues dogs from
shelters and trains them as service animals.

**Current status:** a one-screen "coming to the rescue" landing page, built to get the
custom domain live on Cloudflare. Donations and the back office come later — see
[`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## What's in here

```
public/            ← everything Cloudflare serves. This is the deploy folder.
  index.html         the landing page
  styles.css         all styling (design tokens at the top)
  404.html           not-found page
  favicon.svg        browser tab icon
  robots.txt         search engine instructions
  _headers           security headers, applied at Cloudflare's edge
drafts/            ← NOT deployed. A fuller multi-section homepage for later.
docs/ROADMAP.md    ← donations, back office, and compliance plan
```

**Why a `public/` folder?** Cloudflare only publishes what's inside it. Anything outside —
this README, the `drafts/` folder, notes — stays private in the repo and never reaches
the internet. That separation is the whole reason the folder exists.

**Why no build step, no framework, no npm?** Nothing here needs compiling, so there is
nothing between you and a live page that can break. No dependency updates, no security
advisories, no build failures at 11pm. Cloudflare serves these files directly from ~300
data centers worldwide.

**Why no external fonts or scripts?** Every third-party request is a second point of
failure, a slower first paint, and — for fonts and analytics especially — a privacy
disclosure you'd have to describe in a cookie banner. This page loads from one origin,
sets no cookies, and needs no consent banner.

---

## Editing the page

Open `public/index.html` in any text editor. Search for `TODO` to find everything that
still needs your real information:

| Where | What to replace |
|---|---|
| `index.html` — "Get in touch" link | Set up Email Routing so `info@charliescalltoaction.org` works |
| `index.html` — footer | Add your EIN |
| `index.html` — `og:image` | Add an `og-image.png` (1200×630) for link previews |
| `_headers`, `robots.txt`, `sitemap.xml` | Done — domain already filled in |

To preview locally before pushing:

```bash
python3 -m http.server 8000 --directory public
# then open http://localhost:8000
```

**Why a server instead of double-clicking the file?** Opening it as `file://` breaks
absolute paths like `/styles.css`, so the page appears unstyled. A local server makes
paths resolve exactly as they will in production.

---

## Step-by-step: getting this on your domain

Cloudflare's dashboard wording shifts over time. The **values** below are what matter —
if a label reads slightly differently, match it by meaning.

### Step 1 — Point your domain's nameservers at Cloudflare

In the Cloudflare dashboard, **Add a domain**, enter your domain, and pick the Free plan.
Cloudflare gives you two nameservers. Go to wherever you bought the domain (GoDaddy,
Namecheap, Google Domains…) and replace its nameservers with those two.

**Why this comes first:** Cloudflare can only issue your SSL certificate and attach your
domain automatically once it is *authoritative* for your DNS — meaning it answers the
world's questions about where your domain points. Until nameservers change, it can't.
Propagation is usually minutes, occasionally up to 24 hours. Wait for the domain to show
**Active** before Step 3.

> Skip this step if you registered the domain through Cloudflare Registrar — it's already done.

### Step 2 — Create the Pages project

1. Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorize GitHub and pick **`jmata09/matalegion`**
3. Enter these build settings **exactly**:

   | Field | Value |
   |---|---|
   | Framework preset | **None** |
   | Build command | *(leave completely empty)* |
   | Build output directory | **`public`** |
   | Root directory | *(leave as `/`)* |

4. **Save and Deploy**

**Why empty build command:** there's nothing to compile. If you leave a preset selected,
Cloudflare will try to run a build, find no `package.json`, and fail. "None" plus an empty
command tells it to simply copy `public/` to the edge.

**Production branch:** Cloudflare defaults to `main`. This work is on
`claude/friendly-cerf-tzzrpo`, so either merge the pull request into `main` first, or set
the production branch to `claude/friendly-cerf-tzzrpo` under
**Settings → Build → Branch control** to test before merging.

You'll get a live URL like `matalegion.pages.dev`. **Open it and confirm the page looks
right before attaching your domain** — it's much easier to debug on the `.pages.dev` URL
than mid-DNS-change.

### Step 3 — Attach your custom domain

In the Pages project → **Custom domains** → **Set up a domain**.

Add both, one at a time:
- `charliescalltoaction.org` (the apex/root)
- `www.charliescalltoaction.org`

Cloudflare creates the DNS records itself and provisions a TLS certificate — typically a
minute or two, occasionally ~15.

**Why both?** People type your domain both ways. Whichever you add second, Cloudflare
redirects to the first, so you get one canonical address instead of two versions of the
site competing in search results.

**Why you don't hand-create a DNS record:** for the apex domain a plain `CNAME` is invalid
under the DNS spec. Cloudflare works around this with CNAME flattening, but only when it
manages the record itself. Letting the Custom Domains flow do it avoids that whole trap.

### Step 4 — Lock down HTTPS

Domain → **SSL/TLS**:

- **Overview** → encryption mode **Full (strict)**
- **Edge Certificates** → turn on **Always Use HTTPS**
- **Edge Certificates** → turn on **Automatic HTTPS Rewrites**

**Why Full (strict):** it verifies the certificate on the connection *behind* Cloudflare,
not just in front of it. "Flexible" would leave that half unencrypted while still showing
visitors a padlock — the worst combination, because it looks secure and isn't. For a site
that will one day link to a donation checkout, that matters.

**About HSTS:** the `_headers` file already sends a `Strict-Transport-Security` header.
Don't enable HSTS *preload* yet — preload lists are slow and painful to reverse, so it's
worth waiting until the real site is settled.

### Step 5 — Set up email on the domain

Domain → **Email** → **Email Routing**. Create `info@charliescalltoaction.org` and forward it to
your personal inbox. Then update the "Get in touch" link in `public/index.html`.

**Why:** it's free, it takes two minutes, and a nonprofit asking for trust (and later,
money) should not be reachable only at a gmail address. Email Routing also adds the SPF
and DMARC records that stop people from spoofing your domain.

### Step 6 — Turn on analytics

Domain → **Analytics & Logs** → **Web Analytics**.

**Why Cloudflare's and not Google's:** it's cookieless and collects no personal data, so
it triggers no consent-banner obligation. For a nonprofit handling donor data, collecting
less is straightforwardly better.

---

## Deploying changes after setup

```bash
git add .
git commit -m "Update landing page copy"
git push
```

Cloudflare rebuilds automatically on every push to the production branch — usually live in
under 30 seconds. Pushes to other branches get their own preview URL, so you can look at a
change before it becomes public.

**Rolling back:** Pages project → **Deployments** → find the last good one → **Rollback**.
Every deployment is kept, so a bad change is never more than two clicks from undone.

---

## Security posture today

| Control | Where | Status |
|---|---|---|
| HTTPS everywhere | Cloudflare SSL/TLS | Step 4 |
| HSTS | `public/_headers` | Active on deploy |
| Content Security Policy | `public/_headers` | Active — blocks all scripts |
| Clickjacking protection | `public/_headers` | Active |
| MIME sniffing protection | `public/_headers` | Active |
| DDoS protection | Cloudflare edge | Automatic |
| No cookies, no trackers, no JS | by design | Active |

This page has **no forms, no JavaScript, and no data collection**, which is the reason its
attack surface is close to zero. That changes the moment donations are added — the
security work for that phase is in [`docs/ROADMAP.md`](docs/ROADMAP.md), and it should be
read before any payment code is written.
