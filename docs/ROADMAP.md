# Roadmap — donations, back office, compliance

Phase 1 (the live landing page) is intentionally inert: no forms, no JavaScript, no data
collection. Everything below adds risk, so each item records **why** it's done that way.

> Not legal or tax advice. The engineering here is mine to get right; state registration
> and your specific IRS obligations need a nonprofit attorney or CPA.

---

## Phase 2 — Donations via Stripe Checkout

### The one rule that shapes the whole design

**No card field ever renders on our domain, and no card number ever reaches our code.**

The donate button calls a Cloudflare Worker, the Worker asks Stripe to create a Checkout
Session, and the donor is redirected to Stripe's own hosted page to type their card. We
receive only a session ID and, later, a webhook saying it succeeded.

**Why this is non-negotiable:** fully outsourcing card capture to a hosted payment page is
what keeps us eligible for **PCI-DSS SAQ A** — the shortest self-assessment, a couple of
dozen questions. The moment card data touches our infrastructure we fall into **SAQ D**:
hundreds of controls, quarterly network scans, and obligations no volunteer-run nonprofit
should sign up for. An inline card form looks nicer and costs roughly 100× more work.

### Architecture

```
Donor clicks Donate
   └─> POST /api/checkout            (Cloudflare Worker)
         ├─ verify Turnstile token   (bot / card-testing defense)
         ├─ validate amount server-side
         └─ Stripe: create Checkout Session
               └─> 303 redirect to Stripe's hosted page
                      └─ donor pays on Stripe's domain
                            └─> Stripe POSTs webhook -> /api/webhook
                                  ├─ verify Stripe-Signature   (MUST)
                                  ├─ dedupe on event.id        (MUST)
                                  └─ write record to D1
```

### Non-obvious requirements, and why

- **Verify the webhook signature.** The webhook URL is public. Without signature
  verification anyone who finds it can POST fake "donation succeeded" events and corrupt
  your books. Use Stripe's `constructEventAsync` against the **raw** request body —
  parsing the JSON first changes the bytes and the signature check will fail.
- **Deduplicate on `event.id`.** Stripe retries webhooks until it gets a 2xx. A slow
  response or a transient error means the same event arrives twice, and naive code records
  the same gift twice. Store seen event IDs in KV or D1 and return 200 early on a repeat.
- **Never trust a client-supplied amount blindly.** Anyone can edit the request before it
  leaves their browser. Validate server-side against a minimum and a sane maximum.
- **Put Turnstile in front of checkout creation.** Donation endpoints get hit by
  *card-testing*: bots running stolen card numbers through in small amounts to find live
  ones. This is the single most common reason a small nonprofit's payment account gets
  frozen, and the fraud disputes land on you. Pair it with a **Rate Limiting rule** on
  `/api/checkout`.
- **Secrets go in Worker secrets**, set with `wrangler secret put STRIPE_SECRET_KEY` —
  never in code, never in `wrangler.toml`, never in a committed `.dev.vars`. `.gitignore`
  already blocks the usual accidents.
- **Ask Stripe about their nonprofit rate.** Eligible 501(c)(3)s can get discounted
  processing. Confirm current terms and eligibility directly with Stripe.

### D1 schema sketch

```sql
CREATE TABLE donations (
  id                TEXT PRIMARY KEY,      -- our UUID
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_id TEXT,
  amount_cents      INTEGER NOT NULL,      -- integers only; never floats for money
  currency          TEXT NOT NULL DEFAULT 'usd',
  donor_name        TEXT,
  donor_email       TEXT,
  is_recurring      INTEGER NOT NULL DEFAULT 0,
  receipt_sent_at   TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE webhook_events (            -- the dedupe ledger
  event_id   TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_donations_email   ON donations(donor_email);
CREATE INDEX idx_donations_created ON donations(created_at);
```

**Why `amount_cents` as an integer:** floating point cannot represent `0.10` exactly.
Money in floats accumulates rounding errors, and yours has to reconcile against Stripe's
books and a Form 990. Store whole cents, format for display only.

**What is deliberately absent:** no card number, no CVV, no expiry — not even encrypted.
The safest way to protect data is not to hold it.

---

## Phase 3 — Back office

Scope is still open (you said "not sure yet"), so this is the menu rather than a plan.
Each piece is independent and can be built alone:

| Capability | Build | Cloudflare pieces |
|---|---|---|
| View donations & donors | Admin UI reading D1, with CSV export for your CPA | Workers + D1 |
| Volunteer / contact inbox | Form → Worker → D1, with Turnstile | Workers + D1 + Turnstile |
| Edit site content | Content in D1/KV, rendered by a Worker | Workers + D1 or KV |
| Events & programs | Event records with RSVP capture | Workers + D1 |
| Photos & documents | Dog photos, annual reports, 990s | R2 |

### Authentication: use Cloudflare Access, don't build login

Put **Cloudflare Access** (Zero Trust) in front of `/admin/*` and allow a named list of
email addresses. Access handles the login at the edge, so an unauthenticated request never
reaches your admin code at all.

**Why not roll your own:** custom auth means password hashing, session handling, reset
flows, brute-force lockout, and MFA — each a chance to get something subtly wrong, in front
of donor records. Access is free for up to 50 users, supports one-time email PINs and
Google/Microsoft sign-in, and gives you an audit log. There is no version of hand-rolled
login that is a better use of a nonprofit's time.

---

## Compliance checklist

### Before soliciting donations publicly

- [ ] **Charitable solicitation registration.** Most states require registering before
      asking their residents for money, and a public donate button reaches all of them.
      Confirm your obligations with counsel.
- [ ] **Privacy policy** published — what you collect, why, how long you keep it.
- [ ] **Donor privacy policy** — state plainly whether you ever share or sell donor data.
      (The right answer is no; say so in writing.)
- [ ] **EIN displayed** on the site and on every receipt.
- [ ] Refund/cancellation contact for recurring gifts.

### IRS receipting

- [ ] Written acknowledgment for any single contribution of **$250 or more** — the donor
      cannot claim the deduction without it. Best practice is to receipt every gift.
- [ ] Each receipt must state the **amount**, your **EIN**, and that **no goods or services
      were provided in exchange** — or describe them and give a good-faith value estimate.
- [ ] Contributions **over $75** where the donor gets something back require a **quid pro
      quo disclosure** stating the deductible portion.
- [ ] Annual **Form 990 / 990-EZ / 990-N**, depending on gross receipts.

### Security before launch

- [ ] Stripe webhook signature verification implemented and tested with a *bad* signature
- [ ] Idempotency (event-ID dedupe) verified by replaying the same event twice
- [ ] Turnstile live on every public form
- [ ] Rate limiting on `/api/checkout`
- [ ] Cloudflare Access enforced on `/admin/*`
- [ ] All secrets in Worker secrets; repo scanned for accidentally committed keys
- [ ] CSP in `public/_headers` updated for Stripe (`js.stripe.com`) — widen it deliberately,
      one source at a time, rather than loosening it to `*`
- [ ] D1 backup/export routine in place and actually restored once as a test

---

## Suggested order

1. **Now:** landing page live on the custom domain (Phase 1) ✅
2. Privacy policy + donor privacy policy published
3. Stripe Checkout + webhook + D1 donations table
4. Receipt emails with correct IRS language
5. Cloudflare Access + read-only donation dashboard
6. Volunteer/contact forms with Turnstile
7. Everything else

**Why this order:** each step is useful on its own and nothing gets built on a foundation
that isn't finished. Specifically, the privacy policy comes before the first form because
the moment you collect an email address you have made a promise about it — better to have
written that promise down first.
