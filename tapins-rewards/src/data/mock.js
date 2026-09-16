// Seeded demo data for the ownership pitch. Nothing here talks to Toast; the
// shapes are chosen to mirror what a real integration would deliver so the
// screens stay honest about what production would look like.

export const TIERS = [
  {
    key: 'rookie',
    name: 'Rookie',
    floor: 0,
    color: 'var(--color-tier-rookie)',
    ink: '#2E2A25',
    wash: '#FBF8F0',
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
    color: 'var(--color-tier-member)',
    ink: '#6B5200',
    wash: '#FFF8DC',
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
    color: 'var(--color-tier-circle)',
    ink: '#00432D',
    wash: '#E3F0EA',
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
    name: "The Ace’s Jacket",
    floor: 7500,
    color: 'var(--color-tier-jacket)',
    ink: '#00432D',
    wash: '#D6E8DF',
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

// Cross-venue earn rules. Toast's native loyalty applies one flat rate to the
// whole check; separating them by revenue stream is a core pitch point.
export const EARN_RULES = [
  { source: 'Bar', rate: 1, note: 'One point per dollar' },
  { source: 'Kitchen', rate: 1, note: 'One point per dollar' },
  { source: 'Mini Golf', rate: 2, note: 'Two points per dollar — drives attach to the bar' },
  { source: 'Events', rate: 1.5, note: 'One and a half points per dollar of event spend' },
]

export const SOURCES = {
  Bar: { color: '#007A53', tint: '#E3F0EA' },
  Kitchen: { color: '#00432D', tint: '#DCE8E2' },
  'Mini Golf': { color: '#C79E00', tint: '#FFF8DC' },
  Events: { color: '#009063', tint: '#E8F5EF' },
}

export function tierFor(points) {
  return [...TIERS].reverse().find((t) => points >= t.floor) ?? TIERS[0]
}

export function nextTierFor(points) {
  return TIERS.find((t) => points < t.floor) ?? null
}

const ledger = (entries) =>
  entries.map((e, i) => ({ id: `tx-${i}`, ...e }))

export const GUESTS = [
  {
    id: 'g-01',
    name: 'Marisol Vega',
    joined: 'March 2025',
    lastVisit: '2 days ago',
    visits: 47,
    points: 6240,
    lifetime: 11480,
    birthdayMonth: 'September',
    ledger: ledger([
      { date: 'Sep 14', source: 'Mini Golf', detail: 'Two rounds, Puttview lounge', spend: 68, points: 272, multiplier: 2, promo: 'Tuesday 2x Mini Golf' },
      { date: 'Sep 14', source: 'Bar', detail: 'Bar tab', spend: 94, points: 94 },
      { date: 'Sep 6', source: 'Events', detail: 'Team offsite deposit', spend: 900, points: 1350 },
      { date: 'Aug 30', source: 'Kitchen', detail: 'Dinner, table 12', spend: 112, points: 112 },
      { date: 'Aug 30', source: 'Bar', detail: 'Bar tab', spend: 61, points: 61 },
      { date: 'Aug 22', source: 'Mini Golf', detail: 'League night, nine holes', spend: 40, points: 80 },
      { date: 'Aug 15', source: 'Bar', detail: 'Bar tab', spend: 78, points: 78 },
      { date: 'Aug 9', source: 'Kitchen', detail: 'Lunch', spend: 34, points: 34 },
    ]),
  },
  {
    id: 'g-02',
    name: 'Darnell Pruitt',
    joined: 'June 2024',
    lastVisit: '5 days ago',
    visits: 92,
    points: 9310,
    lifetime: 24905,
    birthdayMonth: 'February',
    ledger: ledger([
      { date: 'Sep 11', source: 'Events', detail: 'Client reception, Pavilion 1', spend: 1840, points: 2760 },
      { date: 'Sep 3', source: 'Bar', detail: 'Bar tab', spend: 128, points: 128 },
      { date: 'Aug 27', source: 'Mini Golf', detail: 'Corporate group, 18 holes', spend: 220, points: 440 },
      { date: 'Aug 19', source: 'Kitchen', detail: 'Dinner for six', spend: 286, points: 286 },
    ]),
  },
  {
    id: 'g-03',
    name: 'Priya Raghunathan',
    joined: 'January 2026',
    lastVisit: '3 weeks ago',
    visits: 11,
    points: 1420,
    lifetime: 1420,
    birthdayMonth: 'November',
    ledger: ledger([
      { date: 'Aug 24', source: 'Mini Golf', detail: 'Date night, nine holes', spend: 36, points: 72 },
      { date: 'Aug 24', source: 'Bar', detail: 'Bar tab', spend: 52, points: 52 },
      { date: 'Aug 2', source: 'Kitchen', detail: 'Brunch', spend: 48, points: 48 },
    ]),
  },
  {
    id: 'g-04',
    name: 'Terrence Boyd',
    joined: 'September 2025',
    lastVisit: 'Yesterday',
    visits: 34,
    points: 4870,
    lifetime: 7120,
    birthdayMonth: 'April',
    ledger: ledger([
      { date: 'Sep 15', source: 'Bar', detail: 'Bar tab', spend: 143, points: 143 },
      { date: 'Sep 15', source: 'Mini Golf', detail: 'Birthday group, 12 players', spend: 186, points: 372 },
      { date: 'Sep 1', source: 'Kitchen', detail: 'Wings and a pitcher', spend: 62, points: 62 },
    ]),
  },
  {
    id: 'g-05',
    name: 'Hannah Okonkwo',
    joined: 'May 2026',
    lastVisit: '1 week ago',
    visits: 6,
    points: 640,
    lifetime: 640,
    birthdayMonth: 'July',
    ledger: ledger([
      { date: 'Sep 8', source: 'Mini Golf', detail: 'First visit, nine holes', spend: 18, points: 36 },
      { date: 'Sep 8', source: 'Bar', detail: 'Bar tab', spend: 29, points: 29 },
    ]),
  },
  {
    id: 'g-06',
    name: 'Grant Whitfield',
    joined: 'November 2023',
    lastVisit: '4 days ago',
    visits: 138,
    points: 12960,
    lifetime: 41220,
    birthdayMonth: 'December',
    ledger: ledger([
      { date: 'Sep 12', source: 'Events', detail: 'Holiday party deposit', spend: 2400, points: 3600 },
      { date: 'Sep 5', source: 'Bar', detail: 'Bar tab', spend: 96, points: 96 },
      { date: 'Aug 29', source: 'Mini Golf', detail: 'League night', spend: 40, points: 80 },
    ]),
  },
  {
    id: 'g-07',
    name: 'Alicia Mendez',
    joined: 'February 2026',
    lastVisit: '2 months ago',
    visits: 9,
    points: 2180,
    lifetime: 2180,
    birthdayMonth: 'October',
    ledger: ledger([
      { date: 'Jul 19', source: 'Events', detail: 'Baby shower, Pavilion 2', spend: 1100, points: 1650 },
      { date: 'Jul 19', source: 'Kitchen', detail: 'Buffet add-on', spend: 240, points: 240 },
    ]),
  },
  {
    id: 'g-08',
    name: 'Cole Barrington',
    joined: 'August 2026',
    lastVisit: '6 days ago',
    visits: 3,
    points: 310,
    lifetime: 310,
    birthdayMonth: 'March',
    ledger: ledger([
      { date: 'Sep 10', source: 'Bar', detail: 'Bar tab', spend: 44, points: 44 },
      { date: 'Sep 10', source: 'Mini Golf', detail: 'Nine holes', spend: 18, points: 36 },
    ]),
  },
  {
    id: 'g-09',
    name: 'Renee Sandoval',
    joined: 'April 2025',
    lastVisit: '9 days ago',
    visits: 58,
    points: 7980,
    lifetime: 15340,
    birthdayMonth: 'June',
    ledger: ledger([
      { date: 'Sep 7', source: 'Mini Golf', detail: 'Ladies league, 2x night', spend: 52, points: 208, multiplier: 2, promo: 'Thursday 2x Mini Golf' },
      { date: 'Sep 7', source: 'Bar', detail: 'Bar tab', spend: 88, points: 88 },
      { date: 'Aug 21', source: 'Kitchen', detail: 'Dinner', spend: 74, points: 74 },
    ]),
  },
  {
    id: 'g-10',
    name: 'Jamal Everett',
    joined: 'July 2025',
    lastVisit: '3 days ago',
    visits: 26,
    points: 3540,
    lifetime: 5610,
    birthdayMonth: 'January',
    ledger: ledger([
      { date: 'Sep 13', source: 'Bar', detail: 'Bar tab', spend: 117, points: 117 },
      { date: 'Sep 2', source: 'Mini Golf', detail: 'Eighteen holes', spend: 34, points: 68 },
      { date: 'Aug 18', source: 'Kitchen', detail: 'Dinner for four', spend: 168, points: 168 },
    ]),
  },
]

export const FEATURED_GUEST_ID = 'g-01'

// Three redemption shapes. Toast's native program only really does the first
// one, which is the argument the catalog screen has to make on its own.
export const CATALOG = [
  {
    id: 'r-01',
    category: 'transactional',
    name: '$10 off your bar tab',
    cost: 1000,
    detail: 'Applies to the open check, any bar in the building.',
    tier: 'rookie',
  },
  {
    id: 'r-02',
    category: 'transactional',
    name: '$25 off food',
    cost: 2200,
    detail: 'Kitchen and pavilion catering both count.',
    tier: 'rookie',
  },
  {
    id: 'r-03',
    category: 'transactional',
    name: '$50 off an event balance',
    cost: 4200,
    detail: 'Comes off the final invoice, not the deposit.',
    tier: 'member',
  },
  {
    id: 'r-04',
    category: 'experiential',
    name: 'Free round of mini golf',
    cost: 1500,
    detail: 'Any open tee time, no blackout dates.',
    tier: 'rookie',
  },
  {
    id: 'r-05',
    category: 'experiential',
    name: 'Bring-a-friend pass',
    cost: 1800,
    detail: 'Your guest plays free and earns their own points.',
    tier: 'member',
  },
  {
    id: 'r-06',
    category: 'experiential',
    name: 'Priority event booking',
    cost: 3000,
    detail: 'Jump the date queue on one private booking.',
    tier: 'member',
  },
  {
    id: 'r-07',
    category: 'tier',
    name: 'Puttview lounge, reserved',
    cost: 3800,
    detail: 'Two hours held in your name on a Friday or Saturday.',
    tier: 'circle',
  },
  {
    id: 'r-08',
    category: 'tier',
    name: 'Chef table for six',
    cost: 6500,
    detail: 'Off-menu tasting built by the kitchen that night.',
    tier: 'circle',
  },
  {
    id: 'r-09',
    category: 'tier',
    name: 'Season pass, unlimited golf',
    cost: 9000,
    detail: 'Every course, every day, for a full calendar year.',
    tier: 'jacket',
  },
  {
    id: 'r-10',
    category: 'tier',
    name: 'Name a hole for a season',
    cost: 12000,
    detail: 'Your name on the scorecard and the marker, all year.',
    tier: 'jacket',
  },
]

export const CATEGORY_LABELS = {
  transactional: {
    title: 'Money off the check',
    blurb: 'The only shape Toast really does. Table stakes, not a differentiator.',
  },
  experiential: {
    title: 'Things to do, not money off',
    blurb: 'Costs the venue margin instead of revenue, and guests value it higher.',
  },
  tier: {
    title: 'Earned by status',
    blurb: 'Locked until the tier is reached. This is what makes climbing worth it.',
  },
}

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

// The five things this prototype exists to prove.
export const TOAST_GAPS = [
  {
    key: 'tiers',
    short: 'Tier complexity',
    claim: 'Four tiers with their own perks, thresholds, and identity.',
    toast: 'Toast supports one flat points balance. There is no concept of a tier to climb.',
  },
  {
    key: 'redemption',
    short: 'Redemption flexibility',
    claim: 'Experiences and status unlocks, not just dollars off.',
    toast: 'Toast redeems points as a discount on the check. That is the whole vocabulary.',
  },
  {
    key: 'data',
    short: 'Guest data ownership',
    claim: 'One profile spanning bar, kitchen, golf, and events — ours to query.',
    toast: 'Guest records live inside Toast and leave with it if you ever switch POS.',
  },
  {
    key: 'comms',
    short: 'Comms automation',
    claim: 'Messages that fire off guest behavior, per guest, at their own moment.',
    toast: 'Toast sends campaign blasts on a calendar. No behavioral triggers.',
  },
  {
    key: 'earn',
    short: 'Custom earn rules',
    claim: 'Mini golf earns double. Events earn one and a half. Bar earns one.',
    toast: 'One flat earn rate applied to the whole check, whatever it was spent on.',
  },
]
