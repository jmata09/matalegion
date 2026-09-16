import { useEffect, useState } from 'react'
import TierCrest from './TierCrest.jsx'
import { fmt } from './ui.jsx'
import { TIERS, tierFor, nextTierFor } from '../../shared/program.js'
import * as api from '../api.js'

// Each rung gets heavier as you climb: cream, then yellow, then green, then the
// jacket in deep green. The surface carries the progression on its own.
const SKIN = {
  rookie: { panel: 'bg-white border-rule', title: 'text-ink', body: 'text-ink-soft', chip: 'bg-black/5 text-ink', perk: 'text-ink' },
  member: { panel: 'bg-brand-yellow-wash border-brand-yellow', title: 'text-ink', body: 'text-ink-soft', chip: 'bg-brand-yellow text-brand-green-deep', perk: 'text-ink' },
  circle: { panel: 'bg-brand-green text-white border-brand-green', title: 'text-white', body: 'text-white/75', chip: 'bg-brand-yellow text-brand-green-deep', perk: 'text-white/90' },
  jacket: { panel: 'bg-brand-green-deep text-white border-brand-yellow', title: 'text-brand-yellow', body: 'text-white/75', chip: 'bg-brand-yellow text-brand-green-deep', perk: 'text-white/90' },
}

export default function TierLadder() {
  const [me, setMe] = useState(null)

  // If a member is already signed in on this device, mark where they stand.
  // The ladder is worth reading either way, so a failure here is silent.
  useEffect(() => {
    const phone = api.getSavedPhone()
    if (!phone) return
    api.lookUp(phone).then(setMe).catch(() => {})
  }, [])

  const current = me ? tierFor(me.balance) : null
  const next = me ? nextTierFor(me.balance) : null
  const currentIndex = current ? TIERS.findIndex((t) => t.key === current.key) : -1

  return (
    <div className="space-y-8">
      <section className="max-w-prose">
        <h2 className="font-display text-4xl leading-tight">
          Everyone can see the jacket from where they stand
        </h2>
        <p className="mt-3 text-ink-soft">
          Four tiers, each with its own threshold, its own crest, and perks you can name before
          you earn them. A points balance on its own gives nobody a reason to come back on a
          Tuesday. A visible next rung does.
        </p>
        {me && (
          <p className="mt-4 rounded-xl border border-rule bg-white px-4 py-3 text-sm">
            <span className="font-semibold">{me.guest.name}</span> sits in {current.name}
            {next ? (
              <>
                , <span className="nums font-semibold text-brand-green">{fmt(next.floor - me.balance)}</span>{' '}
                points from {next.name}.
              </>
            ) : (
              <> &mdash; the top rung.</>
            )}
          </p>
        )}
      </section>

      <ol className="space-y-4">
        {TIERS.map((tier, i) => {
          const skin = SKIN[tier.key]
          const here = currentIndex === i
          const cleared = currentIndex > i
          const ceiling = TIERS[i + 1]

          return (
            <li key={tier.key} className="relative">
              {i > 0 && <span aria-hidden="true" className="absolute -top-4 left-10 h-4 w-0.5 bg-rule" />}
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
                          You are here
                        </span>
                      )}
                      {cleared && <span className={`text-xs font-semibold ${skin.body}`}>Cleared</span>}
                    </div>
                    <p className={`mt-1.5 text-sm italic ${skin.body}`}>{tier.line}</p>
                    <ul className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {tier.perks.map((perk) => (
                        <li key={perk} className={`flex gap-2 text-sm ${skin.perk}`}>
                          <span aria-hidden="true" className="text-brand-yellow">&#9679;</span>
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
    </div>
  )
}
