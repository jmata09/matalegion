// Browser-side client for the Worker API.
//
// Codes live in localStorage so the team types them once per device. They are
// shared secrets, which is right for a closed test among staff and wrong the
// moment a real guest enrols — see the README before that happens.

// The demo build (VITE_DEMO=1) runs the whole app against an in-memory store
// so it can be shared as a link with no backend behind it. Everything else is
// identical, including the rules that decide what a visit is worth.
export const DEMO = import.meta.env.VITE_DEMO === '1'

// Loaded lazily and only in the demo build. A static import would keep the
// module — and its invented members — alive in the production bundle, and
// fabricated guest records have no business shipping in an app that will hold
// real ones. With DEMO folded to false, this branch is dead code and dropped.
const loadDemo = () => import('./demo.js')

const KEY_CLUB = 'aces.clubCode'
const KEY_STAFF = 'aces.staffCode'
const KEY_PHONE = 'aces.phone'

const read = (k) => {
  try {
    return localStorage.getItem(k) ?? ''
  } catch {
    return ''
  }
}
const write = (k, v) => {
  try {
    v ? localStorage.setItem(k, v) : localStorage.removeItem(k)
  } catch {
    /* private browsing; the app still works for this session */
  }
}

export const getClubCode = () => (DEMO ? 'demo' : read(KEY_CLUB))
export const setClubCode = (v) => write(KEY_CLUB, v)
export const getStaffCode = () => (DEMO ? 'demo' : read(KEY_STAFF))
export const setStaffCode = (v) => write(KEY_STAFF, v)
export const getSavedPhone = () => read(KEY_PHONE)
export const setSavedPhone = (v) => write(KEY_PHONE, v)

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function call(path, { method = 'GET', body, staff = false } = {}) {
  const headers = { 'x-club-code': getClubCode() }
  if (body) headers['content-type'] = 'application/json'
  if (staff) headers['x-staff-code'] = getStaffCode()

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`)
  return data
}

export const getProgram = () => call('/program')

export const lookUp = (phone) =>
  DEMO ? loadDemo().then((d) => d.lookUp(phone)) : call(`/me?phone=${encodeURIComponent(phone)}`)

export const enrol = (payload) =>
  DEMO ? loadDemo().then((d) => d.enrol(payload)) : call('/guests', { method: 'POST', body: payload })

export const recordActivity = (payload) =>
  DEMO
    ? loadDemo().then((d) => d.recordActivity(payload))
    : call('/activity', { method: 'POST', body: payload, staff: true })

export const redeem = (payload) =>
  DEMO ? loadDemo().then((d) => d.redeem(payload)) : call('/redeem', { method: 'POST', body: payload })

export const listMembers = () =>
  DEMO ? loadDemo().then((d) => d.listMembers()) : call('/members', { staff: true })
