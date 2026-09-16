// In-memory stand-in for the Worker API, used only in the demo build
// (VITE_DEMO=1). It applies the same rules from shared/program.js, so what you
// see here matches what the real server would do — points are still derived
// from the counter and the amount, and a balance is still the sum of a
// member's ledger entries.
//
// Nothing persists. Reloading the page resets everyone to the seeded state.

import {
  TIERS,
  CATALOG,
  tierFor,
  nextTierFor,
  tierRank,
  pointsForSpend,
  normalisePhone,
} from '../shared/program.js'

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString()
let seq = 0
const id = () => `demo-${++seq}`

const guests = []
const ledger = []

function seedGuest(name, phone, entries, joinedDaysAgo) {
  const guest = {
    id: id(),
    phone,
    name,
    email: null,
    birthday_month: null,
    is_staff: 0,
    created_at: daysAgo(joinedDaysAgo),
  }
  guests.push(guest)
  for (const [days, source, detail, dollars, multiplier, promo] of entries) {
    const spendCents = Math.round(dollars * 100)
    ledger.push({
      id: id(),
      guest_id: guest.id,
      kind: 'earn',
      source,
      detail,
      spend_cents: spendCents,
      points: pointsForSpend(spendCents, source, multiplier ?? 1),
      multiplier: multiplier ?? 1,
      promo: promo ?? null,
      reward_id: null,
      created_at: daysAgo(days),
    })
  }
  return guest
}

seedGuest('Marisol Vega', '9135550188', [
  [2, 'Mini Golf', 'Two rounds, Puttview lounge', 68, 2, 'Tuesday 2x Mini Golf'],
  [2, 'Bar', 'Bar tab', 94],
  [10, 'Events', 'Team offsite deposit', 900],
  [17, 'Kitchen', 'Dinner, table 12', 112],
  [17, 'Bar', 'Bar tab', 61],
  [25, 'Mini Golf', 'League night, nine holes', 40],
  [32, 'Bar', 'Bar tab', 78],
  [38, 'Events', 'Wedding block deposit', 700],
], 540)

seedGuest('Darnell Pruitt', '9135550204', [
  [5, 'Events', 'Client reception, Pavilion 1', 1840],
  [13, 'Bar', 'Bar tab', 128],
  [20, 'Mini Golf', 'Corporate group, 18 holes', 220],
  [28, 'Kitchen', 'Dinner for six', 286],
  [33, 'Events', 'Quarterly client dinner', 2800],
], 820)

seedGuest('Grant Whitfield', '9135550311', [
  [4, 'Events', 'Holiday party deposit', 2400],
  [11, 'Bar', 'Bar tab', 96],
  [18, 'Mini Golf', 'League night', 40],
  [26, 'Kitchen', 'Lunch meeting', 140],
  [35, 'Events', 'Corporate outing', 2600],
], 1030)

seedGuest('Renee Sandoval', '9135550256', [
  [9, 'Mini Golf', 'Ladies league, 2x night', 52, 2, 'Thursday 2x Mini Golf'],
  [9, 'Bar', 'Bar tab', 88],
  [21, 'Kitchen', 'Dinner', 74],
  [30, 'Events', 'Birthday party balance', 480],
], 510)

seedGuest('Terrence Boyd', '9135550147', [
  [1, 'Bar', 'Bar tab', 143],
  [1, 'Mini Golf', 'Birthday group, 12 players', 186],
  [15, 'Kitchen', 'Wings and a pitcher', 62],
  [29, 'Events', 'Deposit, Pavilion 2', 600],
  [36, 'Events', 'Company picnic', 1100],
], 370)

seedGuest('Jamal Everett', '9135550173', [
  [3, 'Bar', 'Bar tab', 117],
  [14, 'Mini Golf', 'Eighteen holes', 34],
  [27, 'Kitchen', 'Dinner for four', 168],
  [40, 'Events', 'Group booking', 300],
  [50, 'Bar', 'Bar tab, party of eight', 250],
], 430)

seedGuest('Alicia Mendez', '9135550295', [
  [58, 'Events', 'Baby shower, Pavilion 2', 1100],
  [58, 'Kitchen', 'Buffet add-on', 240],
  [72, 'Events', 'Reception balance', 900],
], 220)

seedGuest('Priya Raghunathan', '9135550132', [
  [23, 'Mini Golf', 'Date night, nine holes', 36],
  [23, 'Bar', 'Bar tab', 52],
  [45, 'Kitchen', 'Brunch', 48],
  [60, 'Events', 'Small group booking', 700],
], 250)

seedGuest('Hannah Okonkwo', '9135550119', [
  [8, 'Mini Golf', 'First visit, nine holes', 18],
  [8, 'Bar', 'Bar tab', 29],
  [19, 'Kitchen', 'Lunch', 34],
], 120)

seedGuest('Cole Barrington', '9135550166', [
  [6, 'Bar', 'Bar tab', 44],
  [6, 'Mini Golf', 'Nine holes', 18],
], 40)

const entriesFor = (guestId) =>
  ledger
    .filter((l) => l.guest_id === guestId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

const balanceOf = (guestId) =>
  ledger.filter((l) => l.guest_id === guestId).reduce((s, l) => s + l.points, 0)

function payload(guest) {
  const rows = entriesFor(guest.id)
  const balance = balanceOf(guest.id)
  const tier = tierFor(balance)
  const next = nextTierFor(balance)
  return {
    guest: {
      id: guest.id,
      phone: guest.phone,
      name: guest.name,
      email: guest.email,
      birthdayMonth: guest.birthday_month,
      isStaff: Boolean(guest.is_staff),
      joined: guest.created_at,
    },
    balance,
    lifetime: rows.filter((l) => l.points > 0).reduce((s, l) => s + l.points, 0),
    tier,
    next,
    toNext: next ? next.floor - balance : null,
    ledger: rows,
  }
}

const find = (phone) => guests.find((g) => g.phone === phone)
const fail = (status, message) => {
  const err = new Error(message)
  err.status = status
  throw err
}

// Small delay so loading states are visible, as they would be over a network.
const settle = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 180))

export async function lookUp(rawPhone) {
  const phone = normalisePhone(rawPhone)
  if (!phone) fail(400, 'A ten-digit US phone number is required.')
  const guest = find(phone)
  if (!guest) fail(404, 'No member with that number yet.')
  return settle(payload(guest))
}

export async function enrol({ phone: rawPhone, name, isStaff }) {
  const phone = normalisePhone(rawPhone)
  if (!phone) fail(400, 'A ten-digit US phone number is required.')
  if (!String(name ?? '').trim()) fail(400, 'A name is required.')
  const existing = find(phone)
  if (existing) return settle(payload(existing))
  const guest = {
    id: id(),
    phone,
    name: String(name).trim(),
    email: null,
    birthday_month: null,
    is_staff: isStaff ? 1 : 0,
    created_at: new Date().toISOString(),
  }
  guests.push(guest)
  return settle(payload(guest))
}

export async function recordActivity({ phone: rawPhone, source, spendCents, detail, multiplier, promo }) {
  const phone = normalisePhone(rawPhone)
  if (!phone) fail(400, 'A ten-digit US phone number is required.')
  const guest = find(phone)
  if (!guest) fail(404, 'No member with that number yet. Enrol them first.')
  const points = pointsForSpend(spendCents, source, multiplier ?? 1)
  ledger.push({
    id: id(),
    guest_id: guest.id,
    kind: 'earn',
    source,
    detail: detail ?? null,
    spend_cents: spendCents,
    points,
    multiplier: multiplier ?? 1,
    promo: promo ?? null,
    reward_id: null,
    created_at: new Date().toISOString(),
  })
  return settle({ ...payload(guest), awarded: points, duplicate: false })
}

export async function redeem({ phone: rawPhone, rewardId }) {
  const phone = normalisePhone(rawPhone)
  const guest = find(phone)
  if (!guest) fail(404, 'No member with that number yet.')
  const reward = CATALOG.find((r) => r.id === rewardId)
  if (!reward) fail(400, 'Unknown reward.')
  const balance = balanceOf(guest.id)
  if (tierRank(tierFor(balance).key) < tierRank(reward.tier)) {
    fail(409, `That reward unlocks at ${TIERS[tierRank(reward.tier)].name}.`)
  }
  if (balance < reward.cost) fail(409, 'Not enough points for that reward.')
  ledger.push({
    id: id(),
    guest_id: guest.id,
    kind: 'redeem',
    source: null,
    detail: reward.name,
    spend_cents: null,
    points: -reward.cost,
    multiplier: null,
    promo: null,
    reward_id: reward.id,
    created_at: new Date().toISOString(),
  })
  return settle({ ...payload(guest), redeemed: reward })
}

export async function listMembers() {
  const members = guests
    .map((g) => {
      const rows = entriesFor(g.id)
      const balance = balanceOf(g.id)
      return {
        id: g.id,
        name: g.name,
        phone: g.phone,
        is_staff: Boolean(g.is_staff),
        created_at: g.created_at,
        balance,
        lifetime: rows.filter((l) => l.points > 0).reduce((s, l) => s + l.points, 0),
        entries: rows.filter((l) => l.kind === 'earn').length,
        last_activity: rows[0]?.created_at ?? null,
        tier: tierFor(balance),
      }
    })
    .sort((a, b) => b.balance - a.balance)
  return settle({ members })
}
