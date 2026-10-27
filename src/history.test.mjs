import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeStats,
  createSession,
  currentStreak,
  formatTrainingTime,
  loadHistory,
  parseHistory,
  plural,
  saveHistory,
  startOfWeek,
} from './history.js'

// Local-time helper: y, m (1-12), d, h
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min)
const session = (date, rounds = 1, roundDurationSec = 30) =>
  createSession({ rounds, roundDurationSec, restDurationSec: 60, finishedAt: date })

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  }
}

test('weeks start on Monday', () => {
  // Sat 24 Oct 2026 -> Monday 19 Oct
  assert.equal(startOfWeek(at(2026, 10, 24)).getDate(), 19)
  // Sunday belongs to the week that started the previous Monday
  assert.equal(startOfWeek(at(2026, 10, 25)).getDate(), 19)
  assert.equal(startOfWeek(at(2026, 10, 26)).getDate(), 26)
})

test('matches the App Store screenshot: three 1-round 30s sessions today', () => {
  const now = at(2026, 10, 24, 19, 3) // a Saturday, 7:03 pm
  const list = [session(at(2026, 10, 24, 18)), session(at(2026, 10, 24, 18, 30)), session(at(2026, 10, 24, 19))]
  const stats = computeStats(list, now)
  for (const period of ['today', 'week', 'month', 'year', 'all']) {
    assert.deepEqual(stats.totals[period], { sessions: 3, rounds: 3, workSec: 90 }, period)
  }
  assert.equal(formatTrainingTime(stats.totals.today.workSec), '1:30')
  assert.equal(stats.bestDay, 3)
  assert.equal(stats.bestSession, 1)
  assert.equal(stats.longestSessionSec, 30)
  assert.equal(stats.streak, 1)
  assert.equal(stats.streakMessage, 'GOOD START.')
  assert.deepEqual(
    stats.week.map((d) => `${d.initial}${d.rounds}${d.isToday ? '*' : ''}`),
    ['M0', 'T0', 'W0', 'T0', 'F0', 'S3*', 'S0'],
  )
})

test('periods split correctly across week, month and year boundaries', () => {
  const now = at(2026, 11, 2, 9) // Monday 2 Nov 2026
  const list = [
    session(at(2025, 12, 31), 5), // last year
    session(at(2026, 10, 31), 2), // last month, previous week (Saturday)
    session(at(2026, 11, 1), 3), // this month, previous week (Sunday)
    session(at(2026, 11, 2, 7), 4), // today
  ]
  const { totals } = computeStats(list, now)
  assert.equal(totals.today.rounds, 4)
  assert.equal(totals.week.rounds, 4)
  assert.equal(totals.month.rounds, 7)
  assert.equal(totals.year.rounds, 9)
  assert.equal(totals.all.rounds, 14)
})

test('streak counts consecutive days and survives until the end of today', () => {
  const now = at(2026, 10, 27, 8)
  const days = [24, 25, 26].map((d) => session(at(2026, 10, d)))
  // No workout yet today: yesterday's streak is still alive.
  assert.equal(currentStreak(days, now), 3)
  assert.equal(currentStreak([...days, session(at(2026, 10, 27, 7))], now), 4)
  // A missed day breaks it.
  assert.equal(currentStreak([session(at(2026, 10, 24)), session(at(2026, 10, 26))], now), 1)
  assert.equal(currentStreak([session(at(2026, 10, 20))], now), 0)
  assert.equal(currentStreak([], now), 0)
})

test('empty history shows zeros and a starter message', () => {
  const stats = computeStats([], at(2026, 10, 27))
  assert.deepEqual(stats.totals.today, { sessions: 0, rounds: 0, workSec: 0 })
  assert.equal(stats.streak, 0)
  assert.equal(stats.streakMessage, 'START YOUR STREAK TODAY.')
  assert.equal(stats.hasHistory, false)
})

test('storage round-trips, ignores corrupt data and invalid records', () => {
  const storage = memoryStorage()
  const list = [session(at(2026, 10, 24), 3, 180)]
  assert.equal(saveHistory(storage, list), true)
  assert.deepEqual(loadHistory(storage), list)
  assert.deepEqual(parseHistory('{not json'), [])
  assert.deepEqual(parseHistory(JSON.stringify([{ rounds: 'x' }, list[0], null])), list)
  assert.deepEqual(loadHistory({ getItem: () => { throw new Error('blocked') } }), [])
  assert.equal(saveHistory({ setItem: () => { throw new Error('quota') } }, list), false)
})

test('formatting', () => {
  assert.equal(formatTrainingTime(0), '0:00')
  assert.equal(formatTrainingTime(90), '1:30')
  assert.equal(formatTrainingTime(3725), '1:02:05')
  assert.equal(plural(1, 'ROUND'), '1 ROUND')
  assert.equal(plural(3, 'SESSION'), '3 SESSIONS')
})
