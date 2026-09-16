# Ace's Clubhouse Rewards

Loyalty rewards program for **Tap Ins at the Greenhouse**, Overland Park KS.

Currently a working front end running on seeded data. No backend, no accounts,
nothing reads or writes to Toast. See [Where this goes next](#where-this-goes-next).

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static bundle in dist/
```

The build is a plain static bundle. It can be served from Cloudflare Pages,
which is where the rest of this account's hosting already lives.

## The four screens

| Screen | What it shows |
|---|---|
| **Guest app** | A member's home and rewards screens, in a phone frame. Balance, tier, progress to the next tier, a points ledger split by revenue stream, and the redemption catalog with tier-locked items. |
| **Path to the jacket** | All four tiers with thresholds and perks, and a marker for where a given member currently stands. |
| **Automated messages** | Five behavioral triggers with the message each one sends and the condition that fires it. |
| **Operator view** | Every member with tier, balance, visits, and last visit. Points outstanding is the reward liability sitting on the books. |

## The program

Four tiers, by points balance:

| Tier | Threshold |
|---|---|
| Rookie | 0 |
| Member | 1,000 |
| Clubhouse Circle | 3,000 |
| The Ace's Jacket | 7,500 |

Earn rates are set per revenue stream rather than per check — mini golf earns
double because a round pulls a bar tab behind it:

| Counter | Rate |
|---|---|
| Bar | 1× per dollar |
| Kitchen | 1× per dollar |
| Mini Golf | 2× per dollar |
| Events | 1.5× per dollar |

All of this lives in `src/data/mock.js`. Changing a threshold or a rate there
changes every screen.

## Brand

Colors are the two spot colors from the supplied vector logo:

| | Value |
|---|---|
| Green | `#007A53` — PANTONE 341 C |
| Yellow | `#FFCD00` — PANTONE 116 C |

**The typefaces are substitutes.** The brand guidelines specify **New Kansas**
(primary) and **Area Normal** (secondary). Both are commercial licenses and
neither is on Google Fonts, so this uses **Fraunces** for New Kansas and
**Archivo** for Area Normal — close in character, free to serve. Swapping in
the real faces means buying a webfont license and changing two lines in
`src/index.css`. Do that before anything goes in front of guests.

`public/tapins-lockup.png` is the official reversed lockup, extracted from the
supplied brand PDF. It sits on a green field of its own, so the surface behind
it is set to the same green.

## Where this goes next

This is the front end. Making it a tool the team uses daily needs:

1. **Persistence** — Cloudflare D1 behind a Worker. Guests, an append-only
   points ledger, and redemptions. The ledger has to be append-only so a
   balance is always the sum of its entries and never a number someone edited.
2. **Staff auth** — so the people recording activity are known.
3. **Recording activity** — either staff entry against a guest's phone number,
   or automatic ingestion from Toast.

On Toast: **standard API access** covers reading closed checks and needs only an
RMS Essentials subscription and the Manage Integrations permission — no
partner application. Redeeming a reward *on the POS terminal* is a different
thing: Toast calls your endpoint for that, and it requires approved partner
status, which runs through their compliance, privacy, security, and legal
review. Earning can ship long before redemption does.
