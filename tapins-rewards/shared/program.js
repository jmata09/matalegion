// The program's rules, in one file.
//
// Both the Worker and the browser import this. The Worker is the only thing
// that may *apply* it — points are always calculated server-side, because a
// client that can name its own point total is not a loyalty program.

export const TIERS = [
  {
    key: 'rookie',
    name: 'Rookie',
    floor: 0,
    line: 'Everyone starts on the practice green.',
    perks: [
      'Points on every dollar, every counter in the building',
      'Birthday month double points',
      'Member-only tee time window on weekends',
    ],
  },
  {
    key: 'member',
    name: 'Member',
    floor: 1000,
    line: 'You are a regular now, and the building knows it.',
    perks: [
      'Everything in Rookie',
      'Free round of mini golf after every fifth visit',
      'Early access to league nights and tournament sign-ups',
      'No-fee event date holds for 48 hours',
    ],
  },
  {
    key: 'circle',
    name: 'Clubhouse Circle',
    floor: 3000,
    line: 'The table by the window, without asking for it.',
    perks: [
      'Everything in Member',
      'Priority booking on pavilions and Puttview lounge',
      'Bring-a-friend pass every month',
      'Complimentary bay upgrade when one is open',
      'Dedicated events contact for private bookings',
    ],
  },
  {
    key: 'jacket',
    name: 'The Ace’s Jacket',
    floor: 7500,
    line: 'The jacket is the point. Very few of these exist.',
    perks: [
      'Everything in Clubhouse Circle',
      'The jacket itself, fitted and named, kept at the clubhouse',
      'Standing reservation any Friday or Saturday',
      'Two comped guest passes every month',
      'First look at new courses, menus, and events before opening',
      'Annual jacket holders dinner with ownership',
    ],
  },
]

// Earn rate per dollar, by counter. Mini golf earns double because a round
// pulls a bar tab behind it; the rate is doing a job, not just being generous.
export const EARN_RATES = {
  Bar: 1,
  Kitchen: 1,
  'Mini Golf': 2,
  Events: 1.5,
}

export const SOURCES = Object.keys(EARN_RATES)

export const CATALOG = [
  { id: 'r-01', category: 'transactional', name: '$10 off your bar tab', cost: 1000, tier: 'rookie', detail: 'Applies to the open check, any bar in the building.' },
  { id: 'r-02', category: 'transactional', name: '$25 off food', cost: 2200, tier: 'rookie', detail: 'Kitchen and pavilion catering both count.' },
  { id: 'r-03', category: 'transactional', name: '$50 off an event balance', cost: 4200, tier: 'member', detail: 'Comes off the final invoice, not the deposit.' },
  { id: 'r-04', category: 'experiential', name: 'Free round of mini golf', cost: 1500, tier: 'rookie', detail: 'Any open tee time, no blackout dates.' },
  { id: 'r-05', category: 'experiential', name: 'Bring-a-friend pass', cost: 1800, tier: 'member', detail: 'Your guest plays free and earns their own points.' },
  { id: 'r-06', category: 'experiential', name: 'Priority event booking', cost: 3000, tier: 'member', detail: 'Jump the date queue on one private booking.' },
  { id: 'r-07', category: 'tier', name: 'Puttview lounge, reserved', cost: 3800, tier: 'circle', detail: 'Two hours held in your name on a Friday or Saturday.' },
  { id: 'r-08', category: 'tier', name: 'Chef table for six', cost: 6500, tier: 'circle', detail: 'Off-menu tasting built by the kitchen that night.' },
  { id: 'r-09', category: 'tier', name: 'Season pass, unlimited golf', cost: 9000, tier: 'jacket', detail: 'Every course, every day, for a full calendar year.' },
  { id: 'r-10', category: 'tier', name: 'Name a hole for a season', cost: 12000, tier: 'jacket', detail: 'Your name on the scorecard and the marker, all year.' },
]

export const CATEGORY_LABELS = {
  transactional: { title: 'Money off the check' },
  experiential: { title: 'Things to do, not money off' },
  tier: { title: 'Earned by status' },
}

export function tierFor(points) {
  return [...TIERS].reverse().find((t) => points >= t.floor) ?? TIERS[0]
}

export function nextTierFor(points) {
  return TIERS.find((t) => points < t.floor) ?? null
}

export function tierRank(key) {
  return TIERS.findIndex((t) => t.key === key)
}

// Points from a spend. Cents in, whole points out.
//
// Rounding down is deliberate: a guest never sees a balance tick up by a
// fraction they cannot spend, and the house never owes a partial point.
export function pointsForSpend(spendCents, source, multiplier = 1) {
  const rate = EARN_RATES[source]
  if (!rate) throw new Error(`Unknown source: ${source}`)
  if (!Number.isInteger(spendCents) || spendCents < 0) {
    throw new Error('spendCents must be a non-negative integer')
  }
  return Math.floor((spendCents * rate * multiplier) / 100)
}

// Ten digits, no punctuation. One guest per number, however it was typed.
export function normalisePhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return local.length === 10 ? local : null
}

export function formatPhone(ten) {
  return ten ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : ''
}
