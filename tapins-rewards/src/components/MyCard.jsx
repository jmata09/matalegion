import { useCallback, useEffect, useState } from 'react'
import TierCrest from './TierCrest.jsx'
import { Phone, ProgressToNext, LedgerRow, CatalogItem, Notice, fmt, SOURCE_STYLE } from './ui.jsx'
import { CATALOG, CATEGORY_LABELS, normalisePhone, formatPhone } from '../../shared/program.js'
import * as api from '../api.js'

export default function MyCard() {
  const [phone, setPhone] = useState(api.getSavedPhone())
  const [input, setInput] = useState('')
  const [name, setName] = useState('')
  const [needsEnrol, setNeedsEnrol] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')

  const load = useCallback(async (ten) => {
    setBusy(true)
    setError('')
    try {
      const payload = await api.lookUp(ten)
      setData(payload)
      setNeedsEnrol(false)
      api.setSavedPhone(ten)
      setPhone(ten)
    } catch (err) {
      if (err.status === 404) {
        setNeedsEnrol(true)
        setData(null)
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (phone) load(phone)
  }, [phone, load])

  const submitLookup = async (e) => {
    e.preventDefault()
    const ten = normalisePhone(input)
    if (!ten) {
      setError('That does not look like a ten-digit US number.')
      return
    }
    setInput(ten)
    await load(ten)
  }

  const submitEnrol = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const ten = normalisePhone(input) ?? phone
      const payload = await api.enrol({ phone: ten, name: name.trim(), isStaff: true })
      setData(payload)
      setNeedsEnrol(false)
      api.setSavedPhone(ten)
      setPhone(ten)
      setFlash(`Welcome in, ${payload.guest.name.split(' ')[0]}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const doRedeem = async (item) => {
    setBusy(true)
    setError('')
    setFlash('')
    try {
      const payload = await api.redeem({ phone, rewardId: item.id })
      setData(payload)
      setFlash(`Redeemed: ${item.name}. Show this to a team member.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const signOut = () => {
    api.setSavedPhone('')
    setPhone('')
    setData(null)
    setInput('')
    setNeedsEnrol(false)
    setFlash('')
  }

  // Not signed in yet.
  if (!data) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <h2 className="font-display text-4xl leading-tight">Your card</h2>
          <p className="mt-2 text-ink-soft">
            Your phone number is your membership, the same as it works at the register today.
          </p>
        </div>

        {error && <Notice tone="bad">{error}</Notice>}

        {needsEnrol ? (
          <form onSubmit={submitEnrol} className="space-y-4 rounded-2xl border border-rule bg-white p-5">
            <p className="text-sm text-ink-soft">
              No member on {formatPhone(normalisePhone(input) ?? phone)} yet. Let&rsquo;s start one.
            </p>
            <div>
              <label htmlFor="enrol-name" className="block text-sm font-semibold">
                Name
              </label>
              <input
                id="enrol-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="mt-1 w-full rounded-lg border border-rule px-3 py-2.5"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="w-full rounded-lg bg-brand-green py-2.5 font-bold text-white hover:bg-brand-green-mid disabled:opacity-50"
            >
              {busy ? 'Starting…' : 'Start my card'}
            </button>
            <button
              type="button"
              onClick={() => setNeedsEnrol(false)}
              className="w-full text-sm text-ink-soft underline"
            >
              Use a different number
            </button>
          </form>
        ) : (
          <form onSubmit={submitLookup} className="space-y-4 rounded-2xl border border-rule bg-white p-5">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold">
                Phone number
              </label>
              <input
                id="phone"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="913 555 0199"
                className="mt-1 w-full rounded-lg border border-rule px-3 py-2.5 text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-green py-2.5 font-bold text-white hover:bg-brand-green-mid disabled:opacity-50"
            >
              {busy ? 'Looking…' : 'Open my card'}
            </button>
          </form>
        )}
      </div>
    )
  }

  const { guest, balance, lifetime, tier, ledger } = data
  const earnedBySource = ledger
    .filter((l) => l.points > 0 && l.source)
    .reduce((acc, l) => ({ ...acc, [l.source]: (acc[l.source] ?? 0) + l.points }), {})
  const totalShown = Object.values(earnedBySource).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl leading-tight">Your card</h2>
          <p className="text-sm text-ink-soft">{formatPhone(guest.phone)}</p>
        </div>
        <button type="button" onClick={signOut} className="text-sm text-ink-soft underline">
          Not you?
        </button>
      </div>

      {flash && <Notice tone="good">{flash}</Notice>}
      {error && <Notice tone="bad">{error}</Notice>}

      <div className="grid gap-6 sm:grid-cols-2 lg:max-w-4xl">
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
              {fmt(balance)}
            </p>
            <p className="mt-1 text-sm text-white/70">
              points to spend &middot; {fmt(lifetime)} earned all time
            </p>
            <div className="mt-6">
              <ProgressToNext points={balance} />
            </div>
          </div>

          <section className="px-5 py-6">
            <h3 className="font-display text-xl">Where your points came from</h3>
            {totalShown > 0 ? (
              <>
                <div className="mt-3 flex overflow-hidden rounded-lg">
                  {Object.entries(earnedBySource).map(([source, pts]) => (
                    <div
                      key={source}
                      className="h-2.5"
                      style={{
                        width: `${(pts / totalShown) * 100}%`,
                        background: SOURCE_STYLE[source]?.color ?? '#6B655C',
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
                        style={{ background: SOURCE_STYLE[source]?.color ?? '#6B655C' }}
                      />
                      {source} <span className="nums font-semibold text-ink">{fmt(pts)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">
                Nothing yet. Your first visit will show up here.
              </p>
            )}

            <ul className="mt-4">
              {ledger.map((tx) => (
                <LedgerRow key={tx.id} tx={tx} />
              ))}
            </ul>
          </section>
        </Phone>

        <Phone label="Rewards">
          <div className="bg-brand-green px-5 pb-5 pt-7 text-white">
            <h3 className="font-display text-2xl leading-tight">What you can spend them on</h3>
            <p className="nums mt-2 text-sm text-white/80">{fmt(balance)} points available</p>
          </div>
          <div className="bg-cream px-5 py-5">
            {Object.entries(CATEGORY_LABELS).map(([key, meta]) => (
              <div key={key} className="mt-6 first:mt-0">
                <h4 className="font-display text-lg text-brand-green-deep">{meta.title}</h4>
                <ul className="mt-2 grid gap-2">
                  {CATALOG.filter((i) => i.category === key).map((item) => (
                    <CatalogItem
                      key={item.id}
                      item={item}
                      guestTier={tier.key}
                      points={balance}
                      onRedeem={doRedeem}
                      busy={busy}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Phone>
      </div>
    </div>
  )
}
