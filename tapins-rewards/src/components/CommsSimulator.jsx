import { useState } from 'react'
import TierCrest from './TierCrest.jsx'
import { COMMS } from '../data/mock.js'

export default function CommsSimulator() {
  const [activeId, setActiveId] = useState(COMMS[0].id)
  const active = COMMS.find((c) => c.id === activeId)

  return (
    <div className="space-y-8">
      <section className="max-w-prose">
        <h2 className="font-display text-4xl leading-tight">
          Messages that fire off behavior, not off a calendar
        </h2>
        <p className="mt-3 text-ink-soft">
          Each message below is triggered by one guest crossing one threshold, at their own
          moment. Toast sends campaign blasts to a list on a date somebody picked. That
          difference is the clearest thing on this list, and it compounds every week.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <ul className="space-y-3">
          {COMMS.map((c) => {
            const on = c.id === activeId
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  aria-pressed={on}
                  className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition-colors ${
                    on
                      ? 'border-brand-green bg-brand-green-wash'
                      : 'border-rule bg-white hover:border-brand-green/40'
                  }`}
                >
                  <TierCrest tier={c.accent} size={36} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl">{c.trigger}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{c.fires}</span>
                    <span className="mt-2 block text-xs font-semibold text-brand-green">
                      {c.channel} &middot; to {c.guest}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* A lock-screen push is the honest preview: this is where the guest
              actually meets the message. */}
          <div className="rounded-[2rem] border-[10px] border-ink bg-brand-green-deep p-4 shadow-xl">
            <div className="halftone rounded-2xl p-0.5 text-white/10">
              <div className="rounded-[0.9rem] bg-white/95 p-4 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-green text-[10px] font-bold text-brand-yellow">
                    TI
                  </span>
                  <span className="text-xs font-semibold text-ink-soft">
                    Ace&rsquo;s Clubhouse Rewards
                  </span>
                  <span className="ml-auto text-xs text-ink-soft">now</span>
                </div>
                <p className="mt-2.5 font-display text-lg leading-snug text-ink">
                  {active.subject}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{active.body}</p>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-white/50">
              Sent as {active.channel.toLowerCase()}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow-wash p-5">
            <h3 className="font-display text-lg">Why this one earns its send</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{active.why}</p>
          </div>

          <div className="rounded-2xl bg-brand-green-deep p-5 text-white">
            <h3 className="font-display text-lg text-brand-yellow">Trigger condition</h3>
            <p className="mt-1.5 text-sm text-white/80">{active.fires}</p>
            <p className="mt-3 border-t border-white/15 pt-3 text-sm text-white/60">
              Evaluated per guest, continuously. No list to build, no date to pick, no
              campaign to remember to send.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
