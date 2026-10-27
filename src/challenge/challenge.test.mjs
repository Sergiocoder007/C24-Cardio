import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addDaysToDay,
  androidIntentUrl,
  cardDeadline,
  challengeDetails,
  challengeSession,
  challengeTitle,
  challengeUrl,
  cleanName,
  createChallenge,
  deadlineLabel,
  deadlineStatus,
  decodeChallenge,
  encodeChallenge,
  localDay,
  payloadFromUrl,
  shareMessage,
  validateChallenge,
} from './challenge.js'
import { CHALLENGES_KEY, loadChallenges, markChallengeCompleted, parseChallenges, saveChallenges, upsertChallenge } from './store.js'
import { createSession } from '../history.js'

const NOW = new Date(2026, 9, 27, 18, 30).getTime() // Tue 27 Oct 2026, local time
const TODAY = localDay(NOW)
const seq = (values) => {
  let i = 0
  return () => values[i++ % values.length]
}

const base = {
  style: 'boxing',
  level: 'intermediate',
  paceSec: 8,
  rounds: 3,
  roundDurationSec: 120,
  restDurationSec: 60,
  deadline: TODAY,
  from: 'Afroz',
}

const make = (patch = {}, random = Math.random) => createChallenge({ ...base, ...patch }, { now: NOW, random })

// ---- create & validate -------------------------------------------------------

test('creates the example challenge: 3 boxing rounds, 2 min each, 1 min rest, today', () => {
  const c = make({}, seq([0.5]))
  assert.equal(c.id, 'iiiiii')
  assert.equal(challengeTitle(c), '3 BOXING ROUNDS')
  assert.equal(challengeDetails(c), '2 MIN EACH · 1 MIN REST')
  assert.equal(deadlineLabel(c, TODAY), 'COMPLETE TODAY')
  assert.equal(cardDeadline(c, TODAY), 'TODAY · TUE 27 OCT')
})

test('every style and level is accepted', () => {
  for (const style of ['boxing', 'muaythai', 'mixed']) {
    for (const level of ['beginner', 'intermediate', 'advanced']) {
      for (const paceSec of [5, 8, 12]) {
        assert.doesNotThrow(() => make({ style, level, paceSec }))
      }
    }
  }
})

test('rejects out-of-range or malformed workout settings', () => {
  const bad = [
    { style: 'kickboxing' },
    { level: 'pro' },
    { paceSec: 7 },
    { rounds: 0 },
    { rounds: 100 },
    { rounds: 2.5 },
    { rounds: '3' },
    { roundDurationSec: 4 },
    { roundDurationSec: 3601 },
    { roundDurationSec: 62 },
    { restDurationSec: -5 },
    { restDurationSec: 1805 },
    { restDurationSec: 33 },
    { deadline: '2026-02-30' },
    { deadline: 'tomorrow' },
  ]
  for (const patch of bad) {
    assert.throws(() => make(patch), (err) => Array.isArray(err.errors) && err.errors.length > 0, JSON.stringify(patch))
  }
})

test('deadline must be today or later, within a year', () => {
  assert.throws(() => make({ deadline: addDaysToDay(TODAY, -1) }), /past/)
  assert.doesNotThrow(() => make({ deadline: addDaysToDay(TODAY, 365) }))
  assert.throws(() => make({ deadline: addDaysToDay(TODAY, 366) }), /within a year/)
})

test('names are trimmed, cleaned and capped', () => {
  assert.equal(cleanName('  Big   <b>Sam</b>\n '), 'Big bSam/b')
  assert.equal(cleanName('x'.repeat(40)).length, 24)
  assert.equal(cleanName(undefined), '')
  assert.equal(make({ from: '  Coach Ravi  ' }).from, 'Coach Ravi')
})

// ---- encode / decode ---------------------------------------------------------

test('round trip keeps the exact workout, deadline and name', () => {
  for (const from of ['', 'Afroz', 'Ünal 🥊 Çelik', 'محمد', 'a.b-c_d']) {
    for (const style of ['boxing', 'muaythai', 'mixed']) {
      const c = make({ from, style, rounds: 12, roundDurationSec: 185, restDurationSec: 0, deadline: addDaysToDay(TODAY, 3) })
      const decoded = decodeChallenge(encodeChallenge(c))
      assert.equal(decoded.ok, true, decoded.error)
      assert.deepEqual(decoded.challenge, c)
    }
  }
})

test('payload is short and URL-safe', () => {
  const payload = encodeChallenge(make({ from: 'Afroz' }))
  assert.match(payload, /^[A-Za-z0-9._-]+$/)
  assert.ok(payload.length < 60, payload)
  assert.equal(encodeURIComponent(payload), payload)
})

test('a cut-off, edited or garbage link is rejected with a clear message', () => {
  const payload = encodeChallenge(make({}, seq([0.1])))
  const cases = [
    payload.slice(0, -1), // cut off
    payload.replace('.3.120.', '.9.120.'), // rounds edited
    payload.replace('.b.', '.x.'), // style edited
    payload + 'x',
    '',
    'hello',
    '1.b.3.120.60.i.8.20261027.aaaaaa..zzzz',
    'x'.repeat(500),
    null,
    undefined,
    42,
  ]
  for (const p of cases) {
    const r = decodeChallenge(p)
    assert.equal(r.ok, false, String(p))
    assert.ok(typeof r.error === 'string' && r.error.length > 10)
  }
})

test('a newer link version asks for an app update', () => {
  const r = decodeChallenge('2.b.3.120.60.i.8.20261027.aaaaaa..zzzz')
  assert.equal(r.ok, false)
  assert.match(r.error, /newer version/)
})

test('decoding never accepts values the app cannot run', () => {
  // Build bodies with valid checksums but impossible values: still rejected.
  const good = make({}, seq([0.2]))
  const tamper = (patch) => {
    try {
      return encodeChallenge({ ...good, ...patch })
    } catch {
      return null
    }
  }
  assert.equal(tamper({ rounds: 0 }), null) // encode refuses too
  assert.equal(tamper({ deadline: '2026-13-01' }), null)
})

test('an expired challenge still decodes (the screen shows it as expired)', () => {
  const c = make()
  const r = decodeChallenge(encodeChallenge(c))
  const later = addDaysToDay(TODAY, 2)
  assert.equal(r.ok, true)
  assert.equal(deadlineStatus(r.challenge, later), 'expired')
  assert.match(deadlineLabel(r.challenge, later), /^EXPIRED · WAS DUE TUE 27 OCT$/)
  assert.equal(deadlineStatus(r.challenge, TODAY), 'today')
  assert.equal(deadlineStatus(r.challenge, addDaysToDay(TODAY, -1)), 'open')
})

// ---- links -------------------------------------------------------------------

test('share link opens the challenge from https, hash and app-scheme forms', () => {
  const c = make()
  const url = challengeUrl(c)
  const payload = encodeChallenge(c)
  assert.equal(url, `https://sergiocoder007.github.io/C24-Cardio/challenge/?c=${payload}`)
  assert.equal(payloadFromUrl(url), payload)
  assert.equal(payloadFromUrl(`https://c24cardio.fit/challenge/?c=${payload}&utm_source=wa`), payload)
  assert.equal(payloadFromUrl(`https://c24cardio.fit/challenge#c=${payload}`), payload)
  assert.equal(payloadFromUrl(`c24cardio://challenge?c=${payload}`), payload)
  assert.equal(payloadFromUrl(`http://localhost:5173/challenge?c=${payload}`), payload)
})

test('other links are ignored', () => {
  for (const url of [
    'https://c24cardio.fit/',
    'https://c24cardio.fit/?c=abc',
    'https://c24cardio.fit/privacy-policy/?c=abc',
    'https://c24cardio.fit/challenge',
    'c24cardio://other?c=abc',
    'not a url',
    '',
    null,
  ]) {
    assert.equal(payloadFromUrl(url), null, String(url))
  }
})

test('Android intent link targets the app and falls back to the web link', () => {
  const c = make()
  const payload = encodeChallenge(c)
  const intent = androidIntentUrl(payload, challengeUrl(c))
  assert.ok(intent.startsWith(`intent://challenge?c=${payload}#Intent;scheme=c24cardio;package=com.c24cardio.android;`))
  assert.ok(intent.includes(`S.browser_fallback_url=${encodeURIComponent(challengeUrl(c))}`))
  assert.ok(intent.endsWith(';end'))
})

test('share message has the workout, deadline and link', () => {
  const c = make({ deadline: addDaysToDay(TODAY, 3) })
  const msg = shareMessage(c, challengeUrl(c), TODAY)
  assert.match(msg, /Afroz has challenged you!/)
  assert.match(msg, /3 Boxing rounds · 2 min each · 1 min rest/)
  assert.match(msg, /Intermediate · Complete by Fri 30 Oct/)
  assert.ok(msg.endsWith(challengeUrl(c)))
  assert.match(shareMessage({ ...c, deadline: TODAY, from: '' }, 'u', TODAY), /You’ve been challenged![\s\S]*Complete today/)
})

// ---- import into a workout -----------------------------------------------------

test('opening a challenge loads the exact workout as Training mode', () => {
  const c = make({ style: 'muaythai', level: 'advanced', paceSec: 5, rounds: 5, roundDurationSec: 90, restDurationSec: 30 })
  const payload = encodeChallenge(c)
  const { challenge } = decodeChallenge(payloadFromUrl(challengeUrl(c)))
  const session = challengeSession(challenge, payload, 1234)
  assert.deepEqual(session, {
    rounds: 5,
    roundDurationSec: 90,
    restDurationSec: 30,
    training: { style: 'muaythai', level: 'advanced', paceSec: 5, seed: 1234 },
    challenge: payload,
  })
  const record = createSession({ ...session, finishedAt: NOW, mode: 'training' })
  assert.equal(record.challenge, payload)
  assert.equal(record.workSec, 450)
})

test('sessions without a challenge are saved exactly as before', () => {
  const record = createSession({ rounds: 3, roundDurationSec: 60, restDurationSec: 30, finishedAt: NOW })
  assert.equal('challenge' in record, false)
})

// ---- device store ------------------------------------------------------------

function memoryStorage() {
  const map = new Map()
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) }
}

test('store: add, dedupe, complete once, survive reload', () => {
  const storage = memoryStorage()
  const a = encodeChallenge(make())
  const b = encodeChallenge(make({ rounds: 5 }))
  let list = upsertChallenge([], a, 'created', NOW)
  list = upsertChallenge(list, a, 'received', NOW + 1000) // own link opened again
  assert.equal(list.length, 1)
  assert.equal(list[0].role, 'created')
  list = upsertChallenge(list, b, 'received', NOW + 2000)
  assert.deepEqual(list.map((e) => e.payload), [b, a])
  list = markChallengeCompleted(list, a, NOW + 3000)
  list = markChallengeCompleted(list, a, NOW + 9000)
  assert.equal(list.find((e) => e.payload === a).completedAt, new Date(NOW + 3000).toISOString())
  saveChallenges(storage, list)
  assert.deepEqual(loadChallenges(storage), list)
})

test('store: completing an unsaved challenge records it', () => {
  const a = encodeChallenge(make())
  const list = markChallengeCompleted([], a, NOW)
  assert.equal(list.length, 1)
  assert.equal(list[0].role, 'received')
  assert.ok(list[0].completedAt)
})

test('store: invalid or corrupted data is dropped, not crashed on', () => {
  const a = encodeChallenge(make())
  const raw = JSON.stringify([
    { payload: a, role: 'created', addedAt: new Date(NOW).toISOString(), completedAt: null },
    { payload: 'junk', role: 'created', addedAt: new Date(NOW).toISOString(), completedAt: null },
    { payload: a, role: 'boss', addedAt: 'x', completedAt: null },
    null,
  ])
  assert.equal(parseChallenges(raw).length, 1)
  assert.deepEqual(parseChallenges('{oops'), [])
  assert.deepEqual(upsertChallenge([], 'junk', 'created', NOW), [])
  const throwing = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('full') } }
  assert.deepEqual(loadChallenges(throwing), [])
  assert.equal(saveChallenges(throwing, []), false)
  assert.equal(CHALLENGES_KEY, 'c24.challenges.v1')
})

test('validateChallenge reports every problem at once', () => {
  const errors = validateChallenge({ style: 'x', level: 'y', paceSec: 1, rounds: 0, roundDurationSec: 0, restDurationSec: -1, deadline: '', id: '', from: 1 })
  assert.equal(errors.length, 9)
})
