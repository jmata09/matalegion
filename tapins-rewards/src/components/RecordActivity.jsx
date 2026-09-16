import { useState } from 'react'
import TierCrest from './TierCrest.jsx'
import { Notice, fmt } from './ui.jsx'
import { SOURCES, EARN_RATES, pointsForSpend, normalisePhone, formatPhone } from '../../shared/program.js'
import * as api from '../api.js'

const blank = { phone: '', source: 'Bar', amount: '', detail: '', multiplier: '1', promo: '' }

export default function RecordActivity() {
  const [form, setForm] = useState(blank)
  const [staffCode, setStaffCodeState] = useState(api.getStaffCode())
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [enrolName, setEnrolName] = useState('')
  const [needsEnrol, setNeedsEnrol] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Cents, parsed from the dollars a staff member actually types. Rounding here
  // rather than storing a float keeps the ledger exact.
  const cents = Math.round(Number(form.amount || 0) * 100)
  const multiplier = Number(form.multiplier || 1)
  const preview =
    cents > 0 && SOURCES.includes(form.source) && multiplier >= 1
      ? pointsForSpend(cents, form.source, multiplier)
      : 0

  const saveStaffCode = (v) => {
    setStaffCodeState(v)
    api.setStaffCode(v)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    const phone = normalisePhone(form.phone)
    if (!phone) return setError('That does not look like a ten-digit US number.')
    if (cents <= 0) return setError('Enter the amount spent.')

    setBusy(true)
    try {
      const payload = await api.recordActivity({
        phone,
        source: form.source,
        spendCents: cents,
        detail: form.detail.trim() || null,
        multiplier,
        promo: form.promo.trim() || null,
      })
      setResult(payload)
      setForm({ ...blank, source: form.source })
      setNeedsEnrol(false)
    } catch (err) {
      if (err.status === 404) {
        setNeedsEnrol(true)
        setError('')
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const enrolThenRetry = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.enrol({ phone: normalisePhone(form.phone), name: enrolName.trim(), isStaff: true })
      setNeedsEnrol(false)
      setEnrolName('')
      await submit(e)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-4xl leading-tight">Record a visit</h2>
          <p className="mt-2 max-w-prose text-ink-soft">
            Until Toast feeds this automatically, someone keys it in. Points are calculated on
            the server from the counter and the amount &mdash; this form cannot set them directly.
          </p>
        </div>

        {!staffCode && (
          <Notice tone="bad">
            A staff code is needed to record activity. Set it in the panel on the right.
          </Notice>
        )}
        {error && <Notice tone="bad">{error}</Notice>}

        {result && (
          <div className="rounded-2xl border-2 border-brand-green bg-brand-green-wash p-5">
            <div className="flex items-center gap-4">
              <TierCrest tier={result.tier.key} size={44} />
              <div>
                <p className="font-display text-2xl">
                  {result.duplicate ? 'Already recorded' : `+${fmt(result.awarded)} points`}
                </p>
                <p className="text-sm text-ink-soft">
                  {result.guest.name} &middot; {result.tier.name} &middot;{' '}
                  <span className="nums font-semibold">{fmt(result.balance)}</span> total
                  {result.toNext != null && (
                    <> &middot; {fmt(result.toNext)} to {result.next.name}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {needsEnrol ? (
          <form onSubmit={enrolThenRetry} className="space-y-4 rounded-2xl border border-rule bg-white p-5">
            <p className="text-sm text-ink-soft">
              Nobody on {formatPhone(normalisePhone(form.phone))} yet. Add them and the visit posts
              straight after.
            </p>
            <div>
              <label htmlFor="new-name" className="block text-sm font-semibold">Name</label>
              <input
                id="new-name"
                value={enrolName}
                onChange={(e) => setEnrolName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-rule px-3 py-2.5"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || !enrolName.trim()}
                className="flex-1 rounded-lg bg-brand-green py-2.5 font-bold text-white disabled:opacity-50"
              >
                Add member and post
              </button>
              <button
                type="button"
                onClick={() => setNeedsEnrol(false)}
                className="rounded-lg border border-rule px-4 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-rule bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rp" className="block text-sm font-semibold">Guest phone</label>
                <input
                  id="rp"
                  value={form.phone}
                  onChange={set('phone')}
                  inputMode="tel"
                  placeholder="913 555 0199"
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2.5 text-lg"
                />
              </div>
              <div>
                <label htmlFor="ra" className="block text-sm font-semibold">Amount spent</label>
                <input
                  id="ra"
                  value={form.amount}
                  onChange={set('amount')}
                  inputMode="decimal"
                  placeholder="48.50"
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2.5 text-lg"
                />
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold">Counter</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SOURCES.map((s) => (
                  <label
                    key={s}
                    className={`cursor-pointer rounded-lg border-2 p-2.5 text-center text-sm font-semibold ${
                      form.source === s
                        ? 'border-brand-green bg-brand-green-wash text-brand-green-deep'
                        : 'border-rule bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      value={s}
                      checked={form.source === s}
                      onChange={set('source')}
                      className="sr-only"
                    />
                    {s}
                    <span className="block text-xs font-normal text-ink-soft">
                      {EARN_RATES[s]}&times; per $
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="rd" className="block text-sm font-semibold">
                  Note <span className="font-normal text-ink-soft">(optional)</span>
                </label>
                <input
                  id="rd"
                  value={form.detail}
                  onChange={set('detail')}
                  placeholder="Two rounds, Puttview lounge"
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2.5"
                />
              </div>
              <div>
                <label htmlFor="rm" className="block text-sm font-semibold">Multiplier</label>
                <select
                  id="rm"
                  value={form.multiplier}
                  onChange={set('multiplier')}
                  className="mt-1 w-full rounded-lg border border-rule bg-white px-3 py-2.5"
                >
                  <option value="1">None</option>
                  <option value="2">2&times; promo</option>
                  <option value="3">3&times; promo</option>
                </select>
              </div>
            </div>

            {multiplier > 1 && (
              <div>
                <label htmlFor="rpr" className="block text-sm font-semibold">Promo name</label>
                <input
                  id="rpr"
                  value={form.promo}
                  onChange={set('promo')}
                  placeholder="Tuesday 2x Mini Golf"
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2.5"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-4">
              <p className="text-sm text-ink-soft">
                This will award{' '}
                <span className="nums font-display text-3xl text-brand-green">{fmt(preview)}</span>{' '}
                points
              </p>
              <button
                type="submit"
                disabled={busy || !staffCode || preview <= 0}
                className="ml-auto rounded-lg bg-brand-green px-6 py-2.5 font-bold text-white hover:bg-brand-green-mid disabled:opacity-50"
              >
                {busy ? 'Posting…' : 'Post the visit'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-rule bg-white p-5">
          <h3 className="font-display text-xl">Staff code</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Stored on this device only. Recording activity creates value, so it sits behind a
            code the whole team shares for the test.
          </p>
          <input
            type="password"
            value={staffCode}
            onChange={(e) => saveStaffCode(e.target.value)}
            placeholder="staff code"
            autoComplete="off"
            className="mt-3 w-full rounded-lg border border-rule px-3 py-2.5"
          />
        </section>

        <section className="rounded-2xl bg-brand-green-deep p-5 text-white">
          <h3 className="font-display text-xl">Earn rates</h3>
          <ul className="mt-3 divide-y divide-white/15">
            {SOURCES.map((s) => (
              <li key={s} className="flex items-baseline justify-between py-2">
                <span className="text-sm font-semibold">{s}</span>
                <span className="nums font-display text-2xl text-brand-yellow">
                  {EARN_RATES[s]}&times;
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
