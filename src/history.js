// Workout history, stats and streaks. Pure functions; the clock and storage
// are passed in so everything here is testable in Node.
//
// A session is saved only when a workout is completed (stopped workouts are
// discarded — "This session will not be saved").
//
// Session record: { id, finishedAt (ISO string), rounds, roundDurationSec,
//                   restDurationSec, workSec, mode, challenge? }

export const HISTORY_KEY = 'c24.history.v1'
export const MAX_SESSIONS = 5000
const DAY_MS = 24 * 60 * 60 * 1000

// ---- dates (local time) ----------------------------------------------------

export function dayKey(date) {
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Weeks start on Monday, matching the M T W T F S S row in the app.
export function startOfWeek(date) {
  const d = startOfDay(date)
  const offset = (d.getDay() + 6) % 7 // Monday = 0
  return addDays(d, -offset)
}

export function weekDays(now) {
  const monday = startOfWeek(now)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// ---- records ---------------------------------------------------------------

export function isValidSession(s) {
  return Boolean(
    s &&
      typeof s.finishedAt === 'string' &&
      !Number.isNaN(Date.parse(s.finishedAt)) &&
      Number.isFinite(s.rounds) &&
      s.rounds > 0 &&
      Number.isFinite(s.workSec) &&
      s.workSec >= 0,
  )
}

export function createSession({ rounds, roundDurationSec, restDurationSec, finishedAt, mode = 'sparring', challenge }) {
  const at = new Date(finishedAt)
  const record = {
    mode,
    id: `${at.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    finishedAt: at.toISOString(),
    rounds,
    roundDurationSec,
    restDurationSec,
    workSec: rounds * roundDurationSec,
  }
  // Workouts started from a C24 Challenge keep its link code.
  if (typeof challenge === 'string' && challenge) record.challenge = challenge
  return record
}

export function parseHistory(raw) {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    const list = Array.isArray(data) ? data : Array.isArray(data?.sessions) ? data.sessions : []
    return list.filter(isValidSession)
  } catch {
    return []
  }
}

export function loadHistory(storage) {
  try {
    return parseHistory(storage?.getItem(HISTORY_KEY))
  } catch {
    return []
  }
}

export function saveHistory(storage, sessions) {
  const trimmed = sessions.slice(-MAX_SESSIONS)
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify({ version: 1, sessions: trimmed }))
    return true
  } catch {
    return false
  }
}

// ---- stats -----------------------------------------------------------------

function emptyTotals() {
  return { sessions: 0, rounds: 0, workSec: 0 }
}

function addTo(totals, s) {
  totals.sessions += 1
  totals.rounds += s.rounds
  totals.workSec += s.workSec
}

export function roundsByDay(sessions) {
  const map = new Map()
  for (const s of sessions) {
    const key = dayKey(s.finishedAt)
    map.set(key, (map.get(key) ?? 0) + s.rounds)
  }
  return map
}

export function currentStreak(sessions, now) {
  const days = roundsByDay(sessions)
  let cursor = startOfDay(now)
  // A streak stays alive through today even before today's workout.
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  let count = 0
  while (days.has(dayKey(cursor))) {
    count += 1
    cursor = addDays(cursor, -1)
  }
  return count
}

export function streakMessage(days) {
  if (days <= 0) return 'START YOUR STREAK TODAY.'
  if (days === 1) return 'GOOD START.'
  if (days < 7) return 'KEEP IT GOING.'
  if (days < 30) return 'ON FIRE.'
  return 'UNSTOPPABLE.'
}

export function computeStats(sessions, now) {
  const today = dayKey(now)
  const weekStart = startOfWeek(now).getTime()
  const weekEnd = weekStart + 7 * DAY_MS
  const nowDate = new Date(now)
  const month = nowDate.getMonth()
  const year = nowDate.getFullYear()

  const totals = {
    today: emptyTotals(),
    week: emptyTotals(),
    month: emptyTotals(),
    year: emptyTotals(),
    all: emptyTotals(),
  }
  let bestSession = 0
  let longestSessionSec = 0

  for (const s of sessions) {
    const at = new Date(s.finishedAt)
    const t = at.getTime()
    addTo(totals.all, s)
    if (dayKey(at) === today) addTo(totals.today, s)
    if (t >= weekStart && t < weekEnd) addTo(totals.week, s)
    if (at.getFullYear() === year) {
      addTo(totals.year, s)
      if (at.getMonth() === month) addTo(totals.month, s)
    }
    bestSession = Math.max(bestSession, s.rounds)
    longestSessionSec = Math.max(longestSessionSec, s.workSec)
  }

  const byDay = roundsByDay(sessions)
  let bestDay = 0
  for (const rounds of byDay.values()) bestDay = Math.max(bestDay, rounds)

  const todayKey = today
  const week = weekDays(now).map((date) => {
    const key = dayKey(date)
    return {
      key,
      date,
      label: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][(date.getDay() + 6) % 7],
      initial: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][(date.getDay() + 6) % 7],
      rounds: byDay.get(key) ?? 0,
      isToday: key === todayKey,
    }
  })

  const streak = currentStreak(sessions, now)
  return {
    totals,
    bestDay,
    bestSession,
    longestSessionSec,
    week,
    streak,
    streakMessage: streakMessage(streak),
    hasHistory: sessions.length > 0,
  }
}

// ---- formatting --------------------------------------------------------------

export function formatTrainingTime(totalSec) {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function plural(count, one, many = `${one}S`) {
  return `${count} ${count === 1 ? one : many}`
}
