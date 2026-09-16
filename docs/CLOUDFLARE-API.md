# Cloudflare API setup

Scripted alternative to clicking through the dashboard. Two pieces:

- `scripts/cf-setup.sh` — one-time account setup (zone, Pages project, TLS, domains)
- `.github/workflows/deploy.yml` — deploys `public/` on every push to `main`

---

## What can and cannot be automated

| Task | Automatable? |
|---|---|
| Add the domain to Cloudflare (create zone) | ✅ API |
| Read zone status and assigned nameservers | ✅ API |
| **Change nameservers at your registrar** | ❌ **You, at the registrar** |
| Create the Pages project | ✅ API |
| Deploy the site | ✅ `wrangler pages deploy`, from CI |
| Attach custom domains to Pages | ✅ API |
| TLS mode, Always Use HTTPS | ✅ API |
| Email Routing addresses | ⚠️ API exists; dashboard is quicker for a couple of addresses |
| **Connect a GitHub repo to Pages (Git integration)** | ❌ **Dashboard only** |

Two rows are the honest limits.

**The nameserver change** happens at your registrar, not at Cloudflare, and it's the
slow step — minutes to hours of propagation. No API on Cloudflare's side shortens it.

**The Git integration** needs a GitHub OAuth handshake that the API doesn't expose. That
is exactly why this repo deploys by **Direct Upload from GitHub Actions** instead: the
Action runs `wrangler pages deploy`, which needs only an API token. Same outcome — push
to `main`, site updates — with no dashboard-only step, and it extends to Workers and D1
later without changing shape.

---

## Security: where the token lives

**Do not paste a Cloudflare API token into a chat session.** Beyond the general rule,
there's a concrete reason here: the sandbox this repo was built in has outbound access to
`api.cloudflare.com` blocked by its proxy, so a token pasted there could not be used
anyway. It would be exposure with no benefit.

A token lives in exactly two places:

1. **GitHub repository secrets** — for the deploy workflow
2. **Your own shell**, as an environment variable — for the one-time setup script

Use **two separate tokens**, because they have very different blast radii and lifetimes:

| | Deploy token | Setup token |
|---|---|---|
| Lives in | GitHub secrets | Your shell, briefly |
| Lifetime | Long-lived | Delete it when setup is done |
| Can it change DNS? | **No** | Yes |

A deploy token that can only publish files cannot redirect your domain if it leaks. That
distinction matters more than usual for a nonprofit: whoever controls DNS controls where
donors land.

---

## Creating the tokens

Dashboard → **My Profile** → **API Tokens** → **Create Token** → **Custom token**.

### Deploy token — for GitHub Actions

| Type | Resource | Permission |
|---|---|---|
| Account | Cloudflare Pages | **Edit** |

That's all it needs. Nothing about DNS, nothing about zone settings.

### Setup token — for `scripts/cf-setup.sh`, then delete

| Type | Resource | Permission |
|---|---|---|
| Account | Cloudflare Pages | Edit |
| Zone | Zone | Edit |
| Zone | Zone Settings | Edit |
| Zone | DNS | Edit |

Set **Zone Resources** to *All zones from an account* — the zone doesn't exist yet when
you create the token, so it can't be named individually. Set a short **TTL** (a day is
plenty) so it expires on its own if you forget to revoke it.

> Cloudflare renames permission rows occasionally. Match by meaning if the wording
> differs, and confirm against the token UI rather than this table.

### Your Account ID

Dashboard → **Workers & Pages** → the right-hand sidebar shows **Account ID**. It's also
the long hex string in the dashboard URL. It is not secret, but the workflow reads it
from a secret anyway to keep it out of logs.

---

## Running the setup

```bash
export CLOUDFLARE_API_TOKEN='your-setup-token'
export CLOUDFLARE_ACCOUNT_ID='your-account-id'

./scripts/cf-setup.sh status     # read-only — safe to run anytime
```

`status` mutates nothing. It reports whether the zone exists, whether nameservers have
propagated, and whether the Pages project is there. **It is the default**, so a bare
`./scripts/cf-setup.sh` cannot change anything by accident.

Then, in order:

```bash
./scripts/cf-setup.sh zone       # adds the domain, prints your nameservers
#   -> go set those two nameservers at your registrar, wait for status: active
./scripts/cf-setup.sh pages      # creates the Pages project
./scripts/cf-setup.sh ssl        # Full (strict) + Always Use HTTPS
./scripts/cf-setup.sh domains    # attaches apex + www to the project
```

Or `./scripts/cf-setup.sh all` to run them in sequence — though `domains` will fail
until the zone is active, so `all` is best used *after* the nameserver change.

Every command checks current state before acting, so re-running is safe and does nothing
the second time. The token is never printed.

---

## Wiring up GitHub Actions

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the **deploy** token |
| `CLOUDFLARE_ACCOUNT_ID` | your account ID |

After that, every push to `main` validates and deploys. Pull requests run validation only
— they never touch the live site, so an unreviewed branch cannot reach donors.

If the secrets are missing the deploy job fails with a message saying so, rather than
failing obscurely deep inside wrangler.

---

## What the validation job checks

`scripts/validate.py` runs on every push and pull request. No dependencies, so it also
runs locally:

```bash
python3 scripts/validate.py
```

It fails the build on: unclosed or mismatched HTML tags; a missing `<title>`, viewport
meta, or `lang` attribute; `<img>` without alt text; a reference to a local file that
doesn't exist; malformed `sitemap.xml` or `favicon.svg`; a CSS class used in markup but
never defined; a placeholder domain (`example.org`, `yourdomain`) that slipped back in;
and any missing security header in `_headers`.

That last pair matter most. A placeholder domain reaching production means donors see a
dead link, and a dropped CSP line silently removes a protection nobody would notice was
gone.

Each check has been verified to fail when the fault it targets is introduced — a check
that has never failed is not known to work.
