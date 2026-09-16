// Example messages for the Automated messages screen.
//
// These are illustrative copy, not live sends. Nothing here reads the
// database or dispatches anything; the triggers themselves are not built yet.

// Trigger definitions for the comms simulator. Each one is behavioral — it
// fires off guest state, not off a calendar blast.
export const COMMS = [
  {
    id: 'c-01',
    trigger: 'Tier upgrade',
    fires: 'The moment a guest crosses a tier floor',
    channel: 'Push and email',
    guest: 'Terrence Boyd',
    subject: "You're in the Clubhouse Circle",
    body: "Terrence — that last round pushed you over 3,000 points. The window table, priority pavilion booking, and a bring-a-friend pass every month are yours now. Your first one is already in your wallet.",
    why: 'Recognition lands hardest within minutes of the thing that earned it. A scheduled campaign always misses that window.',
    accent: 'circle',
  },
  {
    id: 'c-02',
    trigger: 'Status at risk',
    fires: 'Thirty days before a tier review with a shortfall',
    channel: 'Push and SMS',
    guest: 'Renee Sandoval',
    subject: 'Two visits keeps the Circle',
    body: "Renee — your Clubhouse Circle status reviews on 14 October. You're 320 points short. Two league nights or one dinner covers it, and Thursday is still double on mini golf.",
    why: 'The single highest-return message in any loyalty program, and the one Toast has no concept of, because it requires knowing a tier exists and when it lapses.',
    accent: 'member',
  },
  {
    id: 'c-03',
    trigger: 'Points expiring',
    fires: 'Fourteen days before expiry, only if the balance is spendable',
    channel: 'Email',
    guest: 'Alicia Mendez',
    subject: '1,890 points expire on 30 September',
    body: "Alicia — you have enough for a free round and a bring-a-friend pass, and they expire at the end of the month. Nothing to book, just show up and ask.",
    why: 'Suppressed automatically when the balance is too small to buy anything, so the message never wastes a send or reads as nagging.',
    accent: 'rookie',
  },
  {
    id: 'c-04',
    trigger: 'Birthday month',
    fires: 'The first of the guest birthday month',
    channel: 'Push and email',
    guest: 'Marisol Vega',
    subject: 'September is yours — everything earns double',
    body: "Marisol — happy birthday month. Every dollar you spend in September counts twice, on every counter in the building. The bay is on us if you bring a group.",
    why: 'Double points on a birthday month costs far less than a comped entrée and reliably pulls a group booking instead of a single cover.',
    accent: 'jacket',
  },
  {
    id: 'c-05',
    trigger: 'Lapsed visit',
    fires: 'At sixty days of no activity, once only',
    channel: 'SMS',
    guest: 'Alicia Mendez',
    subject: "It's been a while",
    body: "Alicia — the back nine got rebuilt since you were last in. Here's a free round to come see it. No expiry, no catch.",
    why: 'Fires per guest at their own sixty-day mark, not on a blast date, so the offer always arrives when it is actually relevant.',
    accent: 'rookie',
  },
]
