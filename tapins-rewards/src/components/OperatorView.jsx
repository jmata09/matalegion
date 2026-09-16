import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import TierCrest from './TierCrest.jsx'
import { GUESTS, TIERS, tierFor } from '../data/mock.js'

const fmt = (n) => n.toLocaleString('en-US')
const FILL = { rookie: '#C9C2AF', member: '#FFCD00', circle: '#007A53', jacket: '#00432D' }

const COLUMNS = [
  { key: 'name', label: 'Guest', numeric: false },
  { key: 'tier', label: 'Tier', numeric: false },
  { key: 'points', label: 'Balance', numeric: true },
  { key: 'lifetime', label: 'Lifetime', numeric: true },
  { key: 'visits', label: 'Visits', numeric: true },
  { key: 'lastVisit', label: 'Last visit', numeric: false },
]

export default function OperatorView() {
  const [sort, setSort] = useState({ key: 'points', dir: 'desc' })

  const rows = useMemo(() => {
    const decorated = GUESTS.map((g) => ({ ...g, tier: tierFor(g.points) }))
    const dir = sort.dir === 'asc' ? 1 : -1
    return decorated.sort((a, b) => {
      if (sort.key === 'tier') return (TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier)) * dir
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [sort])

  const distribution = TIERS.map((t) => ({
    name: t.name,
    key: t.key,
    members: GUESTS.filter((g) => tierFor(g.points).key === t.key).length,
  }))

  const outstanding = GUESTS.reduce((sum, g) => sum + g.points, 0)
  const lifetime = GUESTS.reduce((sum, g) => sum + g.lifetime, 0)

  const toggle = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  return (
    <div className="space-y-8">
      <section className="max-w-prose">
        <h2 className="font-display text-4xl leading-tight">The guest list is yours to read</h2>
        <p className="mt-3 text-ink-soft">
          Who is close to a tier, who has stopped coming, and how much reward value is
          sitting on the books. In Toast this lives inside a closed system and leaves with
          the POS if you ever switch.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Members enrolled', value: fmt(GUESTS.length) },
          { label: 'Points outstanding', value: fmt(outstanding), note: 'Reward value on the books' },
          { label: 'Points earned all time', value: fmt(lifetime) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-rule bg-white p-5">
            <p className="nums font-display text-4xl text-brand-green">{stat.value}</p>
            <p className="mt-1 text-sm font-semibold">{stat.label}</p>
            {stat.note && <p className="text-xs text-ink-soft">{stat.note}</p>}
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-rule bg-white p-5">
        <h3 className="font-display text-2xl">Members by tier</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: '#E4DFD3' }}
                tick={{ fill: '#6B655C', fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6B655C', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,122,83,0.06)' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #E4DFD3', fontSize: 13 }}
                formatter={(v) => [`${v} members`, '']}
              />
              <Bar dataKey="members" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {distribution.map((d) => (
                  <Cell key={d.key} fill={FILL[d.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-rule bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">Enrolled members, sortable by column</caption>
            <thead>
              <tr className="border-b border-rule bg-cream text-left">
                {COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className={c.numeric ? 'text-right' : ''}>
                    <button
                      type="button"
                      onClick={() => toggle(c.key)}
                      className={`w-full px-4 py-3 font-semibold hover:text-brand-green ${
                        c.numeric ? 'text-right' : 'text-left'
                      } ${sort.key === c.key ? 'text-brand-green' : ''}`}
                      aria-sort={
                        sort.key === c.key
                          ? sort.dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      {c.label}
                      {sort.key === c.key && (sort.dir === 'asc' ? ' ↑' : ' ↓')}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <TierCrest tier={g.tier.key} size={22} />
                      <span className="text-xs font-semibold">{g.tier.name}</span>
                    </span>
                  </td>
                  <td className="nums px-4 py-3 text-right font-bold text-brand-green">
                    {fmt(g.points)}
                  </td>
                  <td className="nums px-4 py-3 text-right text-ink-soft">{fmt(g.lifetime)}</td>
                  <td className="nums px-4 py-3 text-right text-ink-soft">{g.visits}</td>
                  <td className="px-4 py-3 text-ink-soft">{g.lastVisit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
