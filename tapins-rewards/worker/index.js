import {
  TIERS,
  EARN_RATES,
  SOURCES,
  CATALOG,
  CATEGORY_LABELS,
  tierFor,
  nextTierFor,
  tierRank,
  pointsForSpend,
  normalisePhone,
} from '../shared/program.js'

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

const fail = (status, message) => json({ error: message }, status)

// Constant-time compare so a wrong code cannot be guessed character by
// character from response timing.
function secretMatches(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string') return false
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

const hasClubCode = (req, env) => secretMatches(req.headers.get('x-club-code') ?? '', env.CLUB_CODE ?? '')
const hasStaffCode = (req, env) => secretMatches(req.headers.get('x-staff-code') ?? '', env.STAFF_CODE ?? '')

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()

async function balanceOf(env, guestId) {
  const row = await env.DB.prepare(
    'SELECT COALESCE(SUM(points), 0) AS balance FROM ledger WHERE guest_id = ?',
  )
    .bind(guestId)
    .first()
  return row?.balance ?? 0
}

async function guestByPhone(env, phone) {
  return env.DB.prepare('SELECT * FROM guests WHERE phone = ? AND archived_at IS NULL')
    .bind(phone)
    .first()
}

async function guestPayload(env, guest) {
  const balance = await balanceOf(env, guest.id)
  const { results: ledger } = await env.DB.prepare(
    `SELECT id, kind, source, detail, spend_cents, points, multiplier, promo, reward_id, created_at
       FROM ledger WHERE guest_id = ? ORDER BY created_at DESC LIMIT 100`,
  )
    .bind(guest.id)
    .all()

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
    lifetime: ledger.filter((l) => l.points > 0).reduce((s, l) => s + l.points, 0),
    tier,
    next,
    toNext: next ? next.floor - balance : null,
    ledger,
  }
}

async function handleApi(request, env, url) {
  const path = url.pathname

  // The program's rules are public to anyone already inside the app; they are
  // what the screens render. No secrets live here.
  if (path === '/api/program' && request.method === 'GET') {
    return json({ tiers: TIERS, earnRates: EARN_RATES, sources: SOURCES, catalog: CATALOG, categoryLabels: CATEGORY_LABELS })
  }

  if (!hasClubCode(request, env)) return fail(401, 'Clubhouse code required.')

  // Enrol. Idempotent by phone: giving the same number twice returns the
  // existing member rather than creating a second account for one person.
  if (path === '/api/guests' && request.method === 'POST') {
    const body = await request.json().catch(() => null)
    if (!body) return fail(400, 'Expected a JSON body.')

    const phone = normalisePhone(body.phone)
    if (!phone) return fail(400, 'A ten-digit US phone number is required.')

    const name = String(body.name ?? '').trim()
    if (!name) return fail(400, 'A name is required.')
    if (name.length > 80) return fail(400, 'That name is too long.')

    const existing = await guestByPhone(env, phone)
    if (existing) return json(await guestPayload(env, existing))

    const month = Number.isInteger(body.birthdayMonth) ? body.birthdayMonth : null
    if (month !== null && (month < 1 || month > 12)) return fail(400, 'Birthday month must be 1 to 12.')

    const guest = {
      id: id(),
      phone,
      name,
      email: body.email ? String(body.email).trim().slice(0, 160) : null,
      birthday_month: month,
      is_staff: body.isStaff ? 1 : 0,
      created_at: now(),
    }
    await env.DB.prepare(
      `INSERT INTO guests (id, phone, name, email, birthday_month, is_staff, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(guest.id, guest.phone, guest.name, guest.email, guest.birthday_month, guest.is_staff, guest.created_at)
      .run()

    return json(await guestPayload(env, guest), 201)
  }

  // Look up a member by phone — this is how a guest opens their own card.
  if (path === '/api/me' && request.method === 'GET') {
    const phone = normalisePhone(url.searchParams.get('phone'))
    if (!phone) return fail(400, 'A ten-digit US phone number is required.')
    const guest = await guestByPhone(env, phone)
    if (!guest) return fail(404, 'No member with that number yet.')
    return json(await guestPayload(env, guest))
  }

  // Record activity. Staff only, because this mints value.
  if (path === '/api/activity' && request.method === 'POST') {
    if (!hasStaffCode(request, env)) return fail(403, 'Staff code required to record activity.')

    const body = await request.json().catch(() => null)
    if (!body) return fail(400, 'Expected a JSON body.')

    const phone = normalisePhone(body.phone)
    if (!phone) return fail(400, 'A ten-digit US phone number is required.')
    if (!SOURCES.includes(body.source)) return fail(400, `Source must be one of: ${SOURCES.join(', ')}.`)

    const spendCents = Number(body.spendCents)
    if (!Number.isInteger(spendCents) || spendCents <= 0) return fail(400, 'Spend must be a positive whole number of cents.')
    if (spendCents > 100_000_00) return fail(400, 'That spend looks wrong — over $100,000.')

    const multiplier = body.multiplier == null ? 1 : Number(body.multiplier)
    if (!(multiplier >= 1 && multiplier <= 10)) return fail(400, 'Multiplier must be between 1 and 10.')

    const guest = await guestByPhone(env, phone)
    if (!guest) return fail(404, 'No member with that number yet. Enrol them first.')

    const points = pointsForSpend(spendCents, body.source, multiplier)
    const externalRef = body.externalRef ? String(body.externalRef).slice(0, 120) : null

    // INSERT OR IGNORE plus the UNIQUE index on external_ref is what makes a
    // replayed Toast webhook a no-op instead of double credit.
    const res = await env.DB.prepare(
      `INSERT OR IGNORE INTO ledger
         (id, guest_id, kind, source, detail, spend_cents, points, multiplier, promo, external_ref, recorded_by, created_at)
       VALUES (?, ?, 'earn', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id(),
        guest.id,
        body.source,
        body.detail ? String(body.detail).slice(0, 160) : null,
        spendCents,
        points,
        multiplier,
        body.promo ? String(body.promo).slice(0, 80) : null,
        externalRef,
        body.recordedBy ? String(body.recordedBy).slice(0, 80) : null,
        now(),
      )
      .run()

    const duplicate = res.meta.changes === 0
    return json({ ...(await guestPayload(env, guest)), awarded: duplicate ? 0 : points, duplicate })
  }

  // Redeem. The balance check and the write are one statement, so two taps on
  // the same button cannot both succeed against the same points.
  if (path === '/api/redeem' && request.method === 'POST') {
    const body = await request.json().catch(() => null)
    if (!body) return fail(400, 'Expected a JSON body.')

    const phone = normalisePhone(body.phone)
    if (!phone) return fail(400, 'A ten-digit US phone number is required.')

    const reward = CATALOG.find((r) => r.id === body.rewardId)
    if (!reward) return fail(400, 'Unknown reward.')

    const guest = await guestByPhone(env, phone)
    if (!guest) return fail(404, 'No member with that number yet.')

    const balance = await balanceOf(env, guest.id)
    if (tierRank(tierFor(balance).key) < tierRank(reward.tier)) {
      return fail(409, `That reward unlocks at ${TIERS[tierRank(reward.tier)].name}.`)
    }

    const res = await env.DB.prepare(
      `INSERT INTO ledger (id, guest_id, kind, detail, points, reward_id, recorded_by, created_at)
       SELECT ?, ?, 'redeem', ?, ?, ?, ?, ?
        WHERE (SELECT COALESCE(SUM(points), 0) FROM ledger WHERE guest_id = ?) >= ?`,
    )
      .bind(
        id(),
        guest.id,
        reward.name,
        -reward.cost,
        reward.id,
        body.recordedBy ? String(body.recordedBy).slice(0, 80) : null,
        now(),
        guest.id,
        reward.cost,
      )
      .run()

    if (res.meta.changes === 0) return fail(409, 'Not enough points for that reward.')
    return json({ ...(await guestPayload(env, guest)), redeemed: reward })
  }

  // Operator roster.
  if (path === '/api/members' && request.method === 'GET') {
    if (!hasStaffCode(request, env)) return fail(403, 'Staff code required.')

    const { results } = await env.DB.prepare(
      `SELECT g.id, g.name, g.phone, g.is_staff, g.created_at,
              COALESCE(SUM(l.points), 0) AS balance,
              COALESCE(SUM(CASE WHEN l.points > 0 THEN l.points END), 0) AS lifetime,
              COUNT(CASE WHEN l.kind = 'earn' THEN 1 END) AS entries,
              MAX(l.created_at) AS last_activity
         FROM guests g LEFT JOIN ledger l ON l.guest_id = g.id
        WHERE g.archived_at IS NULL
        GROUP BY g.id
        ORDER BY balance DESC`,
    ).all()

    return json({
      members: results.map((m) => ({ ...m, is_staff: Boolean(m.is_staff), tier: tierFor(m.balance) })),
    })
  }

  return fail(404, 'No such endpoint.')
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url)
      } catch (err) {
        console.error('API error', err)
        return fail(500, 'Something went wrong handling that request.')
      }
    }

    // Everything else is the built single-page app. An asset miss falls back to
    // index.html so client-side routes resolve on a hard refresh.
    const asset = await env.ASSETS.fetch(request)
    if (asset.status === 404) return env.ASSETS.fetch(new URL('/index.html', url.origin))
    return asset
  },
}
