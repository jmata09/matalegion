# Ace's Clubhouse Rewards

Loyalty rewards program for **Tap Ins at the Greenhouse**, Overland Park KS.

A working MVP: real database, real balances, built for the team to use daily.
Your phone number is your membership, the same as it works at the register now.

## How it fits together

```
browser ── one origin ──┬── /api/*   Worker  (worker/index.js)
                        └── /*       the built SPA (dist/)
                                       │
                                  Cloudflare D1  "tapins-rewards"
```

One Worker serves both the API and the app, so the browser talks to a single
origin and there is no CORS to get wrong. Program rules live in
`shared/program.js` and are imported by **both** sides — there is exactly one
definition of a tier threshold or an earn rate.

### Two decisions worth knowing

**The ledger is append-only.** A balance is always `SUM(points)` over a
member's entries, never a stored number. Nothing is ever updated or deleted; a
mistake is fixed by writing a compensating entry. Anything holding value needs
an audit trail more than it needs convenience — and a balance that is always
derived can never silently drift from its history.

**Points are calculated on the server, never sent by the browser.** The form
posts a counter and an amount; the Worker decides what that is worth. A client
that can name its own point total is not a loyalty program.

Two smaller ones: money is stored in integer cents and points as whole
integers, because floats accumulate rounding error and this is a liability on
the books. And `ledger.external_ref` is UNIQUE, which is what will make a
replayed Toast webhook a no-op instead of double credit.

## Screens

| Screen | Who | What |
|---|---|---|
| **Your card** | Everyone | Enter your phone, see your balance, tier, progress, ledger, and redeem rewards. Enrols you if you're new. |
| **Path to the jacket** | Everyone | All four tiers with thresholds and perks, marking where you stand. |
| **Record a visit** | Staff | Key in a guest's phone, counter, and amount. Points are computed server-side. |
| **Members** | Staff | Live roster, tier distribution, and points outstanding — the reward value owed. |
| **Automated messages** | — | Example copy only. **Nothing is sent.** The triggers are not built yet. |

## The program

| Tier | From |
|---|---|
| Rookie | 0 |
| Member | 1,000 |
| Clubhouse Circle | 3,000 |
| The Ace's Jacket | 7,500 |

| Counter | Earn rate |
|---|---|
| Bar | 1× per dollar |
| Kitchen | 1× per dollar |
| Mini Golf | 2× per dollar |
| Events | 1.5× per dollar |

Mini golf earns double on purpose: a round pulls a bar tab behind it, so the
rate is doing a job rather than just being generous. Change any of this in
`shared/program.js` and every screen and the Worker follow.

## Running it locally

```bash
npm install
cp .dev.vars.example .dev.vars   # then edit the two codes
npm run db:local                 # create the tables in the local database
npm run dev:worker               # http://localhost:8787
```

`npm run dev` alone runs the front end only — the API will 404. Use
`dev:worker` for anything involving data.

## Seeing it without a backend

There is a demo build that runs the whole app against an in-memory store, so
it can be shared as a link with nothing deployed behind it:

```bash
npm run preview:demo
```

Ten invented members spread across all four tiers. Recording a visit and
redeeming a reward both work and move the balance — the demo applies the same
rules from `shared/program.js` that the Worker does, so a $68 mini golf round
on a 2x night is worth 272 points either way. Nothing persists; reloading
resets it.

The demo module is imported lazily and only when `VITE_DEMO=1`, so its
invented members are dropped from the production bundle rather than shipping
alongside real ones.

## Deploying

The D1 database **already exists** and its tables are **already created**
(`tapins-rewards`, id in `wrangler.toml`). What is left:

```bash
npx wrangler login                  # once, in a browser
npx wrangler secret put CLUB_CODE   # the code everyone types to get in
npx wrangler secret put STAFF_CODE  # extra code to record activity and see the roster
npm run deploy
```

That prints a `*.workers.dev` URL. Put it on the team's phones and start using
it. To attach a real domain later, add a route in the Cloudflare dashboard
under the Worker's **Settings → Domains & Routes**.

## Security, honestly

This is scoped for a closed test among staff, and the shortcuts are deliberate:

- **Two shared codes, not user accounts.** Anyone with the clubhouse code is
  in; anyone with the staff code can mint points. Fine for a team that trusts
  each other, wrong the moment the group grows.
- **Phone numbers are not verified.** Typing someone's number opens their card.
  With staff-only test data that is a contained risk.
- **Guests can redeem their own rewards.** Redeeming deducts points
  immediately, with no staff confirmation.

**Before a single real guest enrols**, all three need to change: per-person
login (an SMS code to the number being claimed handles identity and
verification at once), staff accounts with named audit entries rather than one
shared code, and staff confirmation on redemption. You will also need a privacy
notice, a consent step at enrolment, and a way to delete someone on request —
you will be holding customer names and phone numbers, which you are not today.

## Toast

Not connected. When you wire it up:

**Earning** needs only **standard API access** — an RMS Essentials
subscription or higher and the Manage Integrations permission on the Overland
Park location. You generate the credentials yourself in Toast Web. No
application, no approval. Closed checks come in, `POST /api/activity` with the
check GUID as `externalRef`, and the UNIQUE constraint makes replays safe.

**Redeeming on the POS terminal** is a different thing. Toast calls *your*
endpoint for loyalty transactions, and that requires approved partner status —
compliance, privacy, security, and legal review, a signed agreement, and a
certification call. Start that process early if you want it; earning can ship
long before redemption does.

## Brand

| | Value |
|---|---|
| Green | `#007A53` — PANTONE 341 C |
| Yellow | `#FFCD00` — PANTONE 116 C |

Both read out of the supplied vector logo. `public/tapins-lockup.png` is the
official reversed lockup extracted from the brand PDF.

**The typefaces are substitutes.** The guidelines specify **New Kansas** and
**Area Normal**; both are commercial licenses and neither is on Google Fonts,
so this ships **Fraunces** and **Archivo** in their place. Buying a webfont
license and changing two lines in `src/index.css` swaps them. Do it before
guests see this.

The retro mascot from the brand assets is **not used yet** — it came through as
an image rather than a file. Send the artwork and it belongs on the empty
states and the enrolment screen.
