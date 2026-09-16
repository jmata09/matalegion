import { useState } from 'react'
import MyCard from './components/MyCard.jsx'
import TierLadder from './components/TierLadder.jsx'
import RecordActivity from './components/RecordActivity.jsx'
import OperatorView from './components/OperatorView.jsx'
import CommsSimulator from './components/CommsSimulator.jsx'
import { Notice } from './components/ui.jsx'
import * as api from './api.js'

const SCREENS = [
  { id: 'card', label: 'Your card', Component: MyCard },
  { id: 'ladder', label: 'Path to the jacket', Component: TierLadder },
  { id: 'record', label: 'Record a visit', Component: RecordActivity },
  { id: 'members', label: 'Members', Component: OperatorView },
  { id: 'comms', label: 'Automated messages', Component: CommsSimulator },
]

// One shared code gates the whole app during the test. That is the right shape
// for a closed trial among staff and the wrong shape the moment a real guest
// enrols — at that point this becomes a per-person login. See the README.
function Gate({ onOpen }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      // A deliberately invalid phone: a wrong code answers 401, a right one
      // gets as far as the 400 validation error.
      const res = await fetch('/api/me?phone=x', { headers: { 'x-club-code': code } })
      if (res.status === 401) {
        setError('That code was not recognised.')
        return
      }
      api.setClubCode(code)
      onOpen()
    } catch {
      setError('Could not reach the clubhouse. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-brand-green-deep px-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6">
        <img src="./tapins-lockup.png" alt="Tap Ins at the Greenhouse" width="180" height="90" className="h-14 w-auto rounded-lg" />
        <div>
          <h1 className="font-display text-3xl leading-tight">Ace&rsquo;s Clubhouse Rewards</h1>
          <p className="mt-1 text-sm text-ink-soft">Enter the clubhouse code to get in.</p>
        </div>
        {error && <Notice tone="bad">{error}</Notice>}
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          aria-label="Clubhouse code"
          className="w-full rounded-lg border border-rule px-3 py-2.5"
        />
        <button
          type="submit"
          disabled={busy || !code}
          className="w-full rounded-lg bg-brand-green py-2.5 font-bold text-white hover:bg-brand-green-mid disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Open the clubhouse'}
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const [open, setOpen] = useState(api.DEMO || Boolean(api.getClubCode()))
  const [active, setActive] = useState('card')

  if (!open) return <Gate onOpen={() => setOpen(true)} />

  const Current = SCREENS.find((s) => s.id === active).Component

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-brand-green-tile text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <img src="./tapins-lockup.png" alt="Tap Ins at the Greenhouse" width="180" height="90" className="h-12 w-auto" />
          <div className="mr-auto">
            <p className="font-display text-xl leading-none">Ace&rsquo;s Clubhouse Rewards</p>
            {api.DEMO && (
              <p className="mt-1 text-sm text-white/70">
                Demo &mdash; invented members, nothing saved. Reload to reset.
              </p>
            )}
          </div>
        </div>
        <nav className="mx-auto max-w-7xl px-5" aria-label="Sections">
          <ul className="flex flex-wrap gap-1">
            {SCREENS.map((s) => {
              const on = s.id === active
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActive(s.id)}
                    aria-current={on ? 'page' : undefined}
                    className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                      on ? 'bg-cream text-brand-green-deep' : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10">
        <Current />
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-7xl px-5 py-6 text-sm text-ink-soft">
          {api.DEMO
            ? 'Every member here is invented. Record a visit and redeem rewards freely \u2014 nothing is saved, and nothing is sent.'
            : 'Balances are live. Automated messages are example copy only \u2014 nothing is sent yet.'}
        </div>
      </footer>
    </div>
  )
}
