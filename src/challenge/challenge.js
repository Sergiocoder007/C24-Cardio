// C24 Challenges: a challenge is a complete workout (rounds, round and rest
// time, style, level, call pace) plus a deadline. It is shared as a
// self-contained link, so there is no server or database: everything needed
// to load the workout is in the link itself.
//
// Link:    https://sergiocoder007.github.io/C24-Cardio/challenge/?c=<payload>  (GitHub Pages, free hosting)
// Payload: 1.<style>.<rounds>.<roundSec>.<restSec>.<level>.<pace>.<yyyymmdd>.<id>.<from>.<check>
//   style  b = Boxing, m = Muay Thai, x = Both
//   level  b = Beginner, i = Intermediate, a = Advanced
//   id     6 random base-36 characters (shown on the card as #ABC123)
//   from   optional challenger name, base64url UTF-8 (may be empty)
//   check  4 base-36 characters (FNV-1a of everything before it), so a link
//          that was cut off or edited is rejected instead of loading a
//          different workout.
// Every character is URL-safe, so the link survives WhatsApp, SMS and email.

import { LEVELS, PACES, STYLES } from '../training/combos.js'
import { REST_DURATION_LIMITS, ROUND_COUNT_LIMITS, ROUND_DURATION_LIMITS, formatDuration } from '../workout.js'

export const CHALLENGE_VERSION = 1
export const SHARE_ORIGIN = 'https://sergiocoder007.github.io/C24-Cardio'
export const SHARE_PATH = '/challenge/'
export const APP_SCHEME = 'c24cardio'
export const MAX_NAME_LENGTH = 24
export const MAX_DEADLINE_DAYS = 365

const STYLE_CODES = { boxing: 'b', muaythai: 'm', mixed: 'x' }
const LEVEL_CODES = { beginner: 'b', intermediate: 'i', advanced: 'a' }
const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]))
const STYLE_FROM_CODE = invert(STYLE_CODES)
const LEVEL_FROM_CODE = invert(LEVEL_CODES)

export const STYLE_NAMES = { boxing: 'BOXING', muaythai: 'MUAY THAI', mixed: 'BOXING + MUAY THAI' }
export const LEVEL_NAMES = { beginner: 'BEGINNER', intermediate: 'INTERMEDIATE', advanced: 'ADVANCED' }
// Short form for the big title; the full style is shown next to it.
const STYLE_TITLES = { boxing: 'BOXING', muaythai: 'MUAY THAI', mixed: 'MIXED' }
const STYLE_WORDS = { boxing: 'Boxing', muaythai: 'Muay Thai', mixed: 'Boxing + Muay Thai' }
const LEVEL_WORDS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }

// ---- dates (local calendar days, YYYY-MM-DD) --------------------------------

export function localDay(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDay(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? '')
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

export function isValidDay(day) {
  return parseDay(day) !== null
}

export function addDaysToDay(day, n) {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return localDay(d)
}

function daysBetween(fromDay, toDay) {
  const a = parseDay(fromDay)
  const b = parseDay(toDay)
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000)
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// "TUE 27 OCT 2026"
export function formatDay(day, { weekday = true, year = true } = {}) {
  const d = parseDay(day)
  if (!d) return ''
  const parts = [`${d.getDate()} ${MONTHS[d.getMonth()]}`]
  if (weekday) parts.unshift(WEEKDAYS[d.getDay()])
  if (year) parts.push(String(d.getFullYear()))
  return parts.join(' ')
}

// ---- names ------------------------------------------------------------------

export function cleanName(name) {
  const text = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(text).slice(0, MAX_NAME_LENGTH).join('').trim()
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

// ---- validation -------------------------------------------------------------

function inRange(value, { min, max }) {
  return Number.isInteger(value) && value >= min && value <= max
}

// Returns a list of problems, worded for the person filling in the form.
// `today` (YYYY-MM-DD) enables the deadline window check used when creating.
export function validateChallenge(c, { today } = {}) {
  const errors = []
  if (!c || typeof c !== 'object') return ['Missing challenge.']
  if (!STYLES.includes(c.style)) errors.push('Choose Boxing, Muay Thai or Both.')
  if (!LEVELS.includes(c.level)) errors.push('Choose a difficulty level.')
  if (!PACES.includes(c.paceSec)) errors.push('Choose how often combos are called.')
  if (!inRange(c.rounds, ROUND_COUNT_LIMITS)) errors.push(`Rounds must be ${ROUND_COUNT_LIMITS.min}–${ROUND_COUNT_LIMITS.max}.`)
  if (!inRange(c.roundDurationSec, ROUND_DURATION_LIMITS) || c.roundDurationSec % ROUND_DURATION_LIMITS.step !== 0) {
    errors.push('Round duration must be between 5 seconds and 60 minutes, in 5-second steps.')
  }
  if (!inRange(c.restDurationSec, REST_DURATION_LIMITS) || c.restDurationSec % REST_DURATION_LIMITS.step !== 0) {
    errors.push('Rest must be between 0 and 30 minutes, in 5-second steps.')
  }
  if (!isValidDay(c.deadline)) errors.push('Choose a deadline date.')
  else if (today) {
    const days = daysBetween(today, c.deadline)
    if (days < 0) errors.push('The deadline can’t be in the past.')
    if (days > MAX_DEADLINE_DAYS) errors.push('The deadline must be within a year.')
  }
  if (typeof c.id !== 'string' || !/^[0-9a-z]{6}$/.test(c.id)) errors.push('Invalid challenge code.')
  if (typeof c.from !== 'string' || c.from !== cleanName(c.from)) errors.push('Invalid name.')
  return errors
}

function randomId(random) {
  let id = ''
  for (let i = 0; i < 6; i += 1) id += Math.floor(random() * 36).toString(36)
  return id
}

// Builds a new challenge from form values. Throws with the list of problems
// if anything is out of range, so an invalid card or link is never made.
export function createChallenge(input, { now = Date.now(), random = Math.random } = {}) {
  const challenge = {
    v: CHALLENGE_VERSION,
    id: randomId(random),
    style: input.style,
    level: input.level,
    paceSec: input.paceSec,
    rounds: input.rounds,
    roundDurationSec: input.roundDurationSec,
    restDurationSec: input.restDurationSec,
    deadline: input.deadline,
    from: cleanName(input.from),
  }
  const errors = validateChallenge(challenge, { today: localDay(now) })
  if (errors.length) {
    const err = new Error(errors.join(' '))
    err.errors = errors
    throw err
  }
  return challenge
}

// ---- encoding ---------------------------------------------------------------

function checksum(text) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return (h % 36 ** 4).toString(36).padStart(4, '0')
}

export function encodeChallenge(c) {
  const errors = validateChallenge(c)
  if (errors.length) throw new Error(errors.join(' '))
  const body = [
    CHALLENGE_VERSION,
    STYLE_CODES[c.style],
    c.rounds,
    c.roundDurationSec,
    c.restDurationSec,
    LEVEL_CODES[c.level],
    c.paceSec,
    c.deadline.replace(/-/g, ''),
    c.id,
    c.from ? toBase64Url(c.from) : '',
  ].join('.')
  return `${body}.${checksum(body)}`
}

const INT = /^(0|[1-9]\d{0,4})$/

// Never throws. Returns { ok: true, challenge, payload } or { ok: false, error }.
export function decodeChallenge(payload) {
  const fail = (error) => ({ ok: false, error })
  if (typeof payload !== 'string' || payload.length > 200) return fail('This challenge link is not valid.')
  const text = payload.trim()
  const parts = text.split('.')
  if (parts[0] !== String(CHALLENGE_VERSION)) {
    return fail(/^\d+$/.test(parts[0]) ? 'This challenge needs a newer version of C24 Cardio.' : 'This challenge link is not valid.')
  }
  if (parts.length !== 11) return fail('This challenge link is incomplete. Ask for the link again.')
  const body = parts.slice(0, 10).join('.')
  if (checksum(body) !== parts[10]) return fail('This challenge link is damaged or incomplete. Ask for the link again.')
  const [, s, rounds, roundSec, restSec, l, pace, date, id, from] = parts
  if (![rounds, roundSec, restSec, pace].every((n) => INT.test(n)) || !/^\d{8}$/.test(date)) {
    return fail('This challenge link is not valid.')
  }
  let name = ''
  if (from) {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(from)) throw new Error('bad name')
      name = fromBase64Url(from)
    } catch {
      return fail('This challenge link is not valid.')
    }
  }
  const challenge = {
    v: CHALLENGE_VERSION,
    id,
    style: STYLE_FROM_CODE[s],
    level: LEVEL_FROM_CODE[l],
    paceSec: Number(pace),
    rounds: Number(rounds),
    roundDurationSec: Number(roundSec),
    restDurationSec: Number(restSec),
    deadline: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    from: name,
  }
  const errors = validateChallenge(challenge)
  if (errors.length) return fail('This challenge link is not valid.')
  return { ok: true, challenge, payload: text }
}

// ---- links ------------------------------------------------------------------

export function challengeUrl(c) {
  return `${SHARE_ORIGIN}${SHARE_PATH}?c=${encodeChallenge(c)}`
}

// Opens the installed Android app from a browser (Chrome "intent:" link);
// if the app is not installed the browser goes to `fallbackUrl` instead.
export function androidIntentUrl(payload, fallbackUrl) {
  return (
    `intent://challenge?c=${payload}#Intent;scheme=${APP_SCHEME};package=com.c24cardio.app;` +
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
  )
}

// Finds the challenge payload in any link that can open the app:
//   …/C24-Cardio/challenge/?c=…, …/challenge#c=…, c24cardio://challenge?c=…
// Returns the payload string or null (not a challenge link).
export function payloadFromUrl(url) {
  if (typeof url !== 'string' || !url) return null
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const fromQuery = parsed.searchParams.get('c')
  const fromHash = new URLSearchParams(parsed.hash.replace(/^#/, '')).get('c')
  const payload = fromQuery ?? fromHash
  if (!payload) return null
  const isApp = parsed.protocol === `${APP_SCHEME}:`
  const isChallengePath = /(^|\/)challenge\/?$/.test(parsed.pathname) || (isApp && /^\/?$/.test(parsed.pathname))
  const isChallengeHost = isApp ? parsed.hostname === 'challenge' || parsed.hostname === '' : true
  return isChallengePath && isChallengeHost ? payload : null
}

// ---- wording ----------------------------------------------------------------

export function challengeTitle(c) {
  return `${c.rounds} ${STYLE_TITLES[c.style]} ${c.rounds === 1 ? 'ROUND' : 'ROUNDS'}`
}

export function challengeDetails(c) {
  const rest = c.restDurationSec === 0 || c.rounds === 1 ? 'NO REST' : `${formatDuration(c.restDurationSec)} REST`
  return `${formatDuration(c.roundDurationSec)} EACH · ${rest}`
}

export function deadlineStatus(c, today) {
  const days = daysBetween(today, c.deadline)
  if (days < 0) return 'expired'
  if (days === 0) return 'today'
  return 'open'
}

// For the in-app screens, relative to the viewer's today.
export function deadlineLabel(c, today) {
  const days = daysBetween(today, c.deadline)
  if (days < 0) return `EXPIRED · WAS DUE ${formatDay(c.deadline, { year: false })}`
  if (days === 0) return 'COMPLETE TODAY'
  if (days === 1) return 'COMPLETE BY TOMORROW'
  return `COMPLETE BY ${formatDay(c.deadline, { year: false })}`
}

// For the card image, which may be seen days later: always an absolute date.
export function cardDeadline(c, today) {
  return c.deadline === today ? `TODAY · ${formatDay(c.deadline, { year: false })}` : `BY ${formatDay(c.deadline)}`
}

const durationWords = (sec) => formatDuration(sec).toLowerCase()
const titleCase = (text) => text.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase())

export function shareMessage(c, url, today) {
  const rest = c.restDurationSec === 0 || c.rounds === 1 ? 'no rest' : `${durationWords(c.restDurationSec)} rest`
  const by = c.deadline === today ? 'Complete today' : `Complete by ${titleCase(formatDay(c.deadline, { year: false }))}`
  const who = c.from ? `${c.from} has challenged you!` : 'You’ve been challenged!'
  return [
    `🥊 C24 CHALLENGE · ${who}`,
    `${c.rounds} ${STYLE_WORDS[c.style]} ${c.rounds === 1 ? 'round' : 'rounds'} · ${durationWords(c.roundDurationSec)} each · ${rest}`,
    `${LEVEL_WORDS[c.level]} · ${by}`,
    `Accept the challenge: ${url}`,
  ].join('\n')
}

export function completionMessage(c, completedDay, url) {
  return [
    `✅ C24 CHALLENGE COMPLETED · ${formatDay(completedDay)}`,
    `${c.rounds} ${STYLE_WORDS[c.style]} ${c.rounds === 1 ? 'round' : 'rounds'} · ${durationWords(c.roundDurationSec)} each · ${LEVEL_WORDS[c.level]}`,
    `Think you can do it? ${url}`,
  ].join('\n')
}

// The workout a challenge loads: Training mode with its style, level and pace.
export function challengeSession(c, payload, seed) {
  return {
    rounds: c.rounds,
    roundDurationSec: c.roundDurationSec,
    restDurationSec: c.restDurationSec,
    training: { style: c.style, level: c.level, paceSec: c.paceSec, seed },
    challenge: payload,
  }
}
