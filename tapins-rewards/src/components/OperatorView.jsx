import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import TierCrest from './TierCrest.jsx'
import { Notice, fmt } from './ui.jsx'
import { TIERS, formatPhone } from '../../shared/program.js'
import * as api from '../api.js'

const FILL = { rookie: '#C9C2AF', member: '#FFCD00', circle: '#007A53', jacket: '#00432D' }

const COLUMNS = [
  { key: 'name', label: 'Member', numeric: false },
  { key: 'tier', label: 'Tier', numeric: false },
  { key: 'balance', label: 'Balance', numeric: true },
  { key: 'lifetime', label: 'Lifetime', numeric: true },
  { key: 'entries', label: 'Visits', numeric: true },
  { key: 'last_activity', label: 'Last activity', numeric: false },
]

const when = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'

export default function OperatorView() {
  const [members, setMembers] = useState(null)
  const [error, setError] = useState('')
  const [sort, setSort] = useState({ key: 'balance', dir: 'desc' })
  const [staffCode, setStaffCodeState] = useState(api.getStaffCode())

  const load = useCallback(async () => {
    setError('')
    try {
      const { members } = await api.listMembers()
      setMembers(members)
    } catch (err) {
      setError(err.message)
      setMembers(null)
    }
  }, [])

  useEffect(() => {
    if (staffCode) load()
  }, [staffCode, load])

  const rows = useMemo(() => {
    if (!members) return []
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...members].sort((a, b) => {
      if (sort.key === 'tier') {
        return (TIERS.findIndex((t) => t.key === a.tier.key) - TIERS.findIndex((t) => t.key === b.tier.key)) * dir
      }
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir
    })
  }, [members, sort])

  const toggle = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  const saveStaffCode = (v) => {
    setStaffCodeState(v)
    api.setStaffCode(v)
  }

  if (!staffCode || error) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h2 className="font-display text-4xl leading-tight">Members</h2>
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="rounded-2xl border border-rule bg-white p-5">
          <label htmlFor="sc" className="block text-sm font-semibold">Staff code</label>
          <p className="mt-1 text-sm text-ink-soft">The roster is staff-only.</p>
          <input
            id="sc"
            type="password"
            value={staffCode}
            onChange={(e) => saveStaffCode(e.target.value)}
            autoComplete="off"
            className="mt-3 w-full rounded-lg border border-rule px-3 py-2.5"
          />
        </div>
      </div>
    )
  }

  if (!members) return <p className="text-ink-soft">Loading the roster&hellip;</p>

  const distribution = TIERS.map((t) => ({
    name: t.name,
    key: t.key,
    members: members.filter((m) => m.tier.key === t.key).length,
  }))
  const outstanding = members.reduce((s, m) => s + m.balance, 0)
  const lifetime = members.reduce((s, m) => s + m.lifetime, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-4xl leading-tight">Members</h2>
          <p className="mt-2 max-w-prose text-ink-soft">
            Live from the ledger. Points outstanding is reward value owed &mdash; a real number
            on the books, not a vanity metric.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-rule bg-white px-4 py-2 text-sm font-semibold hover:border-brand-green"
        >
          Refresh
        </button>
      </div>

      {members.length === 0 ? (
        <Notice>Nobody has enrolled yet. Add your first member from Record a visit.</Notice>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Members enrolled', value: fmt(members.length) },
              { label: 'Points outstanding', value: fmt(outstanding), note: 'Reward value owed' },
              { label: 'Points earned all time', value: fmt(lifetime) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-rule bg-white p-5">
                <p className="nums font-display text-4xl text-brand-green">{s.value}</p>
                <p className="mt-1 text-sm font-semibold">{s.label}</p>
                {s.note && <p className="text-xs text-ink-soft">{s.note}</p>}
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-rule bg-white p-5">
            <h3 className="font-display text-2xl">Members by tier</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#E4DFD3' }} tick={{ fill: '#6B655C', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#6B655C', fontSize: 12 }} />
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
              <table className="w-full min-w-[48rem] text-sm">
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
                          aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          {c.label}
                          {sort.key === c.key && (sort.dir === 'asc' ? ' ↑' : ' ↓')}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="border-b border-rule/60 last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">{m.name}</span>
                        <span className="block text-xs text-ink-soft">{formatPhone(m.phone)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <TierCrest tier={m.tier.key} size={22} />
                          <span className="text-xs font-semibold">{m.tier.name}</span>
                        </span>
                      </td>
                      <td className="nums px-4 py-3 text-right font-bold text-brand-green">{fmt(m.balance)}</td>
                      <td className="nums px-4 py-3 text-right text-ink-soft">{fmt(m.lifetime)}</td>
                      <td className="nums px-4 py-3 text-right text-ink-soft">{m.entries}</td>
                      <td className="px-4 py-3 text-ink-soft">{when(m.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
