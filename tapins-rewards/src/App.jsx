import { useState } from 'react'
import GuestApp from './components/GuestApp.jsx'
import TierLadder from './components/TierLadder.jsx'
import CommsSimulator from './components/CommsSimulator.jsx'
import OperatorView from './components/OperatorView.jsx'

const SCREENS = [
  { id: 'guest', label: 'Guest app', Component: GuestApp },
  { id: 'ladder', label: 'Path to the jacket', Component: TierLadder },
  { id: 'comms', label: 'Automated messages', Component: CommsSimulator },
  { id: 'operator', label: 'Operator view', Component: OperatorView },
]

export default function App() {
  const [active, setActive] = useState('guest')
  const Current = SCREENS.find((s) => s.id === active).Component

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-brand-green-tile text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <img
            src="./tapins-lockup.png"
            alt="Tap Ins at the Greenhouse"
            width="180"
            height="90"
            className="h-12 w-auto"
          />
          <div className="mr-auto">
            <p className="font-display text-xl leading-none text-white">
              Ace&rsquo;s Clubhouse Rewards
            </p>
            <p className="mt-1 text-sm text-white/70">
              Prototype for ownership &mdash; seeded data, no live systems connected
            </p>
          </div>
        </div>

        <nav className="mx-auto max-w-7xl px-5" aria-label="Prototype screens">
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
                      on
                        ? 'bg-cream text-brand-green-deep'
                        : 'text-white/75 hover:bg-white/10 hover:text-white'
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
          Every guest, balance, and message on these screens is invented for the
          pitch. Nothing here reads or writes to Toast.
        </div>
      </footer>
    </div>
  )
}
