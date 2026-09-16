import { useState } from 'react'
import TierCrest from './TierCrest.jsx'
import { GUESTS, TIERS, FEATURED_GUEST_ID, tierFor, nextTierFor } from '../data/mock.js'

const fmt = (n) => n.toLocaleString('en-US')

// Each rung gets heavier as you climb: cream, then yellow, then green, then the
// jacket in deep green. The surface itself carries the sense of progression.
const SKIN = {
  rookie: { panel: 'bg-white border-rule', title: 'text-ink', body: 'text-ink-soft', chip: 'bg-black/5 text-ink' },
  member: { panel: 'bg-brand-yellow-wash border-brand-yellow', title: 'text-ink', body: 'text-ink-soft', chip: 'bg-brand-yellow text-brand-green-deep' },
  circle: { panel: 'bg-brand-green text-white border-brand-green', title: 'text-white', body: 'text-white/75', chip: 'bg-brand-yellow text-brand-green-deep' },
  jacket: { panel: 'bg-brand-green-deep text-white border-brand-yellow', title: 'text-brand-yellow', body: 'text-white/75', chip: 'bg-brand-yellow text-brand-green-deep' },
}

export default function TierLadder() {
  const [guestId, setGuestId] = useState(FEATURED_GUEST_ID)
  const guest = GUESTS.find((g) => g.id === guestId)
  const current = tierFor(guest.points)
  const next = nextTierFor(guest.points)

  return (
    <div className="space-y-8">
      <section className="max-w-prose">
        <h2 className="font-display text-4xl leading-tight">Everyone can see the jacket from where they stand</h2>
        <p className="mt-3 text-ink-soft">
          Four tiers, each with its own threshold, its own crest, and perks a guest can
          name before they earn them. A points balance on its own gives nobody a reason
          to come back on a Tuesday. A visible next rung does.
        </p>
      </section>

      <section className="rounded-2xl border border-rule bg-white p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label htmlFor="ladder-guest" className="text-sm font-semibold">
            Show the climb for
          </label>
          <select
            id="ladder-guest"
            value={guestId}
            onChange={(e) => setGuestId(e.target.value)}
            className="rounded-lg border border-rule bg-white px-3 py-2 text-sm font-medium"
          >
            {GUESTS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {fmt(g.points)} points
              </option>
            ))}
          </select>
          <p className="text-sm text-ink-soft">
            {next ? (
              <>
                <span className="font-semibold text-ink">{guest.name}</span> sits in{' '}
                {current.name}, <span className="nums font-semibold text-brand-green">{fmt(next.floor - guest.points)}</span>{' '}
                points from {next.name}.
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">{guest.name}</span> already holds the jacket.
              </>
            )}
          </p>
        </div>
      </section>

      <ol className="space-y-4">
        {TIERS.map((tier, i) => {
          const skin = SKIN[tier.key]
          const here = tier.key === current.key
          const passed = i < TIERS.findIndex((t) => t.key === current.key)
          const ceiling = TIERS[i + 1]

          return (
            <li key={tier.key} className="relative">
              {/* Spine connecting the rungs, drawn between cards only. */}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-4 left-10 h-4 w-0.5 bg-rule"
                />
              )}

              <article
                className={`rounded-2xl border-2 p-5 sm:p-6 ${skin.panel} ${
                  here ? 'ring-4 ring-brand-yellow ring-offset-2 ring-offset-cream' : ''
                }`}
              >
                <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
                  <TierCrest tier={tier.key} size={56} className="shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className={`font-display text-2xl ${skin.title}`}>{tier.name}</h3>
                      <span className={`nums rounded-md px-2 py-1 text-xs font-bold ${skin.chip}`}>
                        {fmt(tier.floor)}
                        {ceiling ? `–${fmt(ceiling.floor - 1)}` : '+'} points
                      </span>
                      {here && (
                        <span className="rounded-md bg-brand-yellow px-2 py-1 text-xs font-bold text-brand-green-deep">
                          {guest.name} is here
                        </span>
                      )}
                      {passed && (
                        <span className={`text-xs font-semibold ${skin.body}`}>Cleared</span>
                      )}
                    </div>
                    <p className={`mt-1.5 text-sm italic ${skin.body}`}>{tier.line}</p>

                    <ul className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {tier.perks.map((perk) => (
                        <li
                          key={perk}
                          className={`flex gap-2 text-sm ${
                            tier.key === 'circle' || tier.key === 'jacket'
                              ? 'text-white/90'
                              : 'text-ink'
                          }`}
                        >
                          <span aria-hidden="true" className="text-brand-yellow">
                            &#9679;
                          </span>
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ol>

      <section className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow-wash p-6">
        <h3 className="font-display text-2xl">Why this screen exists</h3>
        <p className="mt-2 max-w-prose text-ink-soft">
          Toast's loyalty has one balance and no concept of a tier, so there is nothing to
          picture and nothing to climb. Every perk on this page is a reason to choose Tap Ins
          over the place down the road, and the top rung is a jacket with someone's name in it.
        </p>
      </section>
    </div>
  )
}
