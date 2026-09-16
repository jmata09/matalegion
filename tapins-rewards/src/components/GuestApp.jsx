import { useState } from 'react'
import TierCrest from './TierCrest.jsx'
import {
  GUESTS,
  TIERS,
  CATALOG,
  CATEGORY_LABELS,
  EARN_RULES,
  SOURCES,
  FEATURED_GUEST_ID,
  tierFor,
  nextTierFor,
} from '../data/mock.js'

const rank = (key) => TIERS.findIndex((t) => t.key === key)
const fmt = (n) => n.toLocaleString('en-US')

function ProgressToNext({ points }) {
  const tier = tierFor(points)
  const next = nextTierFor(points)

  if (!next) {
    return (
      <div className="rounded-xl bg-brand-yellow/15 px-4 py-3 text-sm text-white">
        You hold the jacket. Nothing above this one.
      </div>
    )
  }

  const span = next.floor - tier.floor
  const pct = Math.min(100, Math.round(((points - tier.floor) / span) * 100))

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm text-white/85">
        <span>
          <span className="nums font-semibold text-white">{fmt(next.floor - points)}</span> points
          to {next.name}
        </span>
        <span className="nums text-white/60">{pct}%</span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress to ${next.name}`}
      >
        <div className="h-full rounded-full bg-brand-yellow" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function LedgerRow({ tx }) {
  const src = SOURCES[tx.source]
  return (
    <li className="flex items-start gap-3 border-b border-rule/70 py-3 last:border-0">
      <span
        className="mt-0.5 shrink-0 rounded-md px-2 py-1 text-[11px] font-bold"
        style={{ background: src.tint, color: src.color }}
      >
        {tx.source}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{tx.detail}</span>
        <span className="block text-xs text-ink-soft">
          {tx.date} &middot; ${tx.spend} spent
        </span>
        {tx.promo && (
          <span className="mt-1 inline-block rounded bg-brand-yellow px-1.5 py-0.5 text-[11px] font-bold text-brand-green-deep">
            {tx.promo}
          </span>
        )}
      </span>
      <span className="nums shrink-0 text-right text-sm font-bold text-brand-green">
        +{fmt(tx.points)}
      </span>
    </li>
  )
}

function CatalogItem({ item, guestTier, points }) {
  const locked = rank(item.tier) > rank(guestTier)
  const lockTier = TIERS[rank(item.tier)]
  const short = item.cost - points

  return (
    <li
      className={`rounded-xl border p-3 ${
        locked ? 'border-rule bg-black/[0.02]' : 'border-rule bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${locked ? 'text-ink-soft' : 'text-ink'}`}>
            {item.name}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">{item.detail}</p>
        </div>
        <span
          className={`nums shrink-0 rounded-md px-2 py-1 text-xs font-bold ${
            locked ? 'bg-black/5 text-ink-soft' : 'bg-brand-green-wash text-brand-green'
          }`}
        >
          {fmt(item.cost)}
        </span>
      </div>

      {locked ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          <TierCrest tier={item.tier} size={16} />
          Unlocks at {lockTier.name}
        </p>
      ) : short > 0 ? (
        <p className="nums mt-2 text-xs text-ink-soft">{fmt(short)} points short</p>
      ) : (
        <button
          type="button"
          className="mt-2 w-full rounded-lg bg-brand-green py-1.5 text-xs font-bold text-white hover:bg-brand-green-mid"
        >
          Redeem
        </button>
      )}
    </li>
  )
}

function Phone({ label, children }) {
  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-[2.25rem] border-[10px] border-ink bg-white shadow-xl">
        {children}
      </div>
      <figcaption className="mt-2 text-center text-xs font-semibold text-ink-soft">
        {label}
      </figcaption>
    </figure>
  )
}

export default function GuestApp() {
  const [guestId, setGuestId] = useState(FEATURED_GUEST_ID)
  const guest = GUESTS.find((g) => g.id === guestId)
  const tier = tierFor(guest.points)

  const earnedBySource = guest.ledger.reduce((acc, tx) => {
    acc[tx.source] = (acc[tx.source] ?? 0) + tx.points
    return acc
  }, {})
  const totalShown = Object.values(earnedBySource).reduce((a, b) => a + b, 0)

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      {/* Two frames rather than one scrolling frame: the catalog is half the
          argument, and inside a single phone it never gets seen. */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Phone label="Home">
          <div className="bg-brand-green-deep px-5 pb-6 pt-7 text-white">
            <div className="flex items-center gap-4">
              <TierCrest tier={tier.key} size={56} />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl leading-tight">{guest.name}</p>
                <p className="text-sm text-brand-yellow">{tier.name}</p>
              </div>
            </div>

            <p className="nums mt-6 font-display text-6xl leading-none text-brand-yellow">
              {fmt(guest.points)}
            </p>
            <p className="mt-1 text-sm text-white/70">
              points to spend &middot; {fmt(guest.lifetime)} earned all time
            </p>

            <div className="mt-6">
              <ProgressToNext points={guest.points} />
            </div>
          </div>

          <section className="px-5 py-6">
            <h2 className="font-display text-xl">Where your points came from</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Every counter in the building, on one account.
            </p>

            <div className="mt-3 flex overflow-hidden rounded-lg">
              {Object.entries(earnedBySource).map(([source, pts]) => (
                <div
                  key={source}
                  className="h-2.5"
                  style={{
                    width: `${(pts / totalShown) * 100}%`,
                    background: SOURCES[source].color,
                  }}
                  title={`${source}: ${fmt(pts)}`}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(earnedBySource).map(([source, pts]) => (
                <li key={source} className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: SOURCES[source].color }}
                  />
                  {source} <span className="nums font-semibold text-ink">{fmt(pts)}</span>
                </li>
              ))}
            </ul>

            <ul className="mt-4">
              {guest.ledger.map((tx) => (
                <LedgerRow key={tx.id} tx={tx} />
              ))}
            </ul>
          </section>
        </Phone>

        <Phone label="Rewards">
          <div className="bg-brand-green px-5 pb-5 pt-7 text-white">
            <h2 className="font-display text-2xl leading-tight">What you can spend them on</h2>
            <p className="nums mt-2 text-sm text-white/80">
              {fmt(guest.points)} points available
            </p>
          </div>
          <div className="bg-cream px-5 py-5">
            {Object.entries(CATEGORY_LABELS).map(([key, meta]) => (
              <div key={key} className="mt-6 first:mt-0">
                <h3 className="font-display text-lg text-brand-green-deep">{meta.title}</h3>
                <p className="mb-2 mt-0.5 text-xs text-ink-soft">{meta.blurb}</p>
                <ul className="grid gap-2">
                  {CATALOG.filter((i) => i.category === key).map((item) => (
                    <CatalogItem
                      key={item.id}
                      item={item}
                      guestTier={tier.key}
                      points={guest.points}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Phone>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="font-display text-3xl leading-tight">
            The guest&rsquo;s whole account, in one place
          </h2>
          <p className="mt-2 text-ink-soft">
            Bar tabs, mini golf rounds, kitchen checks, and event deposits all land on the
            same profile and earn at their own rate.
          </p>
        </section>

        <section className="rounded-2xl border border-rule bg-white p-5">
          <h3 className="font-display text-xl">Switch guest</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Ten accounts across all four tiers.
          </p>
          <ul className="mt-4 grid gap-2">
            {GUESTS.map((g) => {
              const t = tierFor(g.points)
              const on = g.id === guestId
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setGuestId(g.id)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                      on
                        ? 'border-brand-green bg-brand-green-wash'
                        : 'border-rule bg-white hover:border-brand-green/40'
                    }`}
                  >
                    <TierCrest tier={t.key} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{g.name}</span>
                      <span className="block text-xs text-ink-soft">{t.name}</span>
                    </span>
                    <span className="nums text-sm font-bold text-brand-green">{fmt(g.points)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-2xl bg-brand-green-deep p-5 text-white">
          <h3 className="font-display text-xl">Earn rates by counter</h3>
          <p className="mt-1 text-sm text-white/70">
            Set per revenue stream. Mini golf earns double because a round pulls a bar tab
            behind it.
          </p>
          <ul className="mt-4 divide-y divide-white/15">
            {EARN_RULES.map((rule) => (
              <li key={rule.source} className="flex items-baseline gap-3 py-2.5">
                <span className="text-sm font-semibold">{rule.source}</span>
                <span className="nums ml-auto font-display text-2xl text-brand-yellow">
                  {rule.rate}&times;
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
