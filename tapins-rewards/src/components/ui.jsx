import TierCrest from './TierCrest.jsx'
import { TIERS, tierFor, nextTierFor, tierRank } from '../../shared/program.js'

export const fmt = (n) => Number(n ?? 0).toLocaleString('en-US')
export const dollars = (cents) => `$${(cents / 100).toFixed(2)}`

// Presentation only — the earn rates themselves live in shared/program.js.
export const SOURCE_STYLE = {
  Bar: { color: '#007A53', tint: '#E3F0EA' },
  Kitchen: { color: '#00432D', tint: '#DCE8E2' },
  'Mini Golf': { color: '#C79E00', tint: '#FFF8DC' },
  Events: { color: '#009063', tint: '#E8F5EF' },
}

export function Phone({ label, children }) {
  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-[2.25rem] border-[10px] border-ink bg-white shadow-xl">
        {children}
      </div>
      {label && (
        <figcaption className="mt-2 text-center text-xs font-semibold text-ink-soft">
          {label}
        </figcaption>
      )}
    </figure>
  )
}

export function ProgressToNext({ points }) {
  const tier = tierFor(points)
  const next = nextTierFor(points)

  if (!next) {
    return (
      <div className="rounded-xl bg-brand-yellow/15 px-4 py-3 text-sm text-white">
        You hold the jacket. Nothing above this one.
      </div>
    )
  }

  const pct = Math.min(100, Math.round(((points - tier.floor) / (next.floor - tier.floor)) * 100))

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

export function LedgerRow({ tx }) {
  const redeem = tx.kind === 'redeem'
  const src = SOURCE_STYLE[tx.source] ?? { color: '#6B655C', tint: '#EFEDE6' }
  const when = tx.created_at
    ? new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : tx.date

  return (
    <li className="flex items-start gap-3 border-b border-rule/70 py-3 last:border-0">
      <span
        className="mt-0.5 shrink-0 rounded-md px-2 py-1 text-[11px] font-bold"
        style={
          redeem
            ? { background: '#FBEAEA', color: '#8C2F2F' }
            : { background: src.tint, color: src.color }
        }
      >
        {redeem ? 'Reward' : tx.source}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{tx.detail ?? '—'}</span>
        <span className="block text-xs text-ink-soft">
          {when}
          {tx.spend_cents ? ` · ${dollars(tx.spend_cents)} spent` : ''}
        </span>
        {tx.promo && (
          <span className="mt-1 inline-block rounded bg-brand-yellow px-1.5 py-0.5 text-[11px] font-bold text-brand-green-deep">
            {tx.promo}
          </span>
        )}
      </span>
      <span
        className={`nums shrink-0 text-right text-sm font-bold ${
          redeem ? 'text-[#8C2F2F]' : 'text-brand-green'
        }`}
      >
        {tx.points > 0 ? '+' : ''}
        {fmt(tx.points)}
      </span>
    </li>
  )
}

export function CatalogItem({ item, guestTier, points, onRedeem, busy }) {
  const locked = tierRank(item.tier) > tierRank(guestTier)
  const short = item.cost - points

  return (
    <li className={`rounded-xl border p-3 ${locked ? 'border-rule bg-black/[0.02]' : 'border-rule bg-white'}`}>
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
          Unlocks at {TIERS[tierRank(item.tier)].name}
        </p>
      ) : short > 0 ? (
        <p className="nums mt-2 text-xs text-ink-soft">{fmt(short)} points short</p>
      ) : (
        <button
          type="button"
          onClick={() => onRedeem?.(item)}
          disabled={busy}
          className="mt-2 w-full rounded-lg bg-brand-green py-1.5 text-xs font-bold text-white hover:bg-brand-green-mid disabled:opacity-50"
        >
          {busy ? 'Redeeming…' : 'Redeem'}
        </button>
      )}
    </li>
  )
}

export function Notice({ tone = 'info', children }) {
  const skin = {
    info: 'border-rule bg-white text-ink',
    good: 'border-brand-green bg-brand-green-wash text-brand-green-deep',
    bad: 'border-[#E2B4B4] bg-[#FBEAEA] text-[#8C2F2F]',
  }[tone]
  return <p className={`rounded-xl border px-4 py-3 text-sm ${skin}`}>{children}</p>
}
