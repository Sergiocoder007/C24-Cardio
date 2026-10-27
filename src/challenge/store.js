// Challenges kept on this device: ones you created and ones you opened from a
// link, with the date you completed each. Stored next to the workout history
// in local storage; nothing leaves the device.
//
// Entry: { payload, role: 'created' | 'received', addedAt (ISO), completedAt (ISO | null) }
// The payload (the link code) is the identity and is re-validated on load.

import { decodeChallenge } from './challenge.js'

export const CHALLENGES_KEY = 'c24.challenges.v1'
export const MAX_CHALLENGES = 200

function isValidEntry(e) {
  return Boolean(
    e &&
      typeof e.payload === 'string' &&
      decodeChallenge(e.payload).ok &&
      (e.role === 'created' || e.role === 'received') &&
      typeof e.addedAt === 'string' &&
      !Number.isNaN(Date.parse(e.addedAt)) &&
      (e.completedAt === null || (typeof e.completedAt === 'string' && !Number.isNaN(Date.parse(e.completedAt)))),
  )
}

export function parseChallenges(raw) {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(isValidEntry) : []
  } catch {
    return []
  }
}

export function loadChallenges(storage) {
  try {
    return parseChallenges(storage?.getItem(CHALLENGES_KEY))
  } catch {
    return []
  }
}

export function saveChallenges(storage, list) {
  try {
    storage?.setItem(CHALLENGES_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

// Adds a challenge, or keeps the existing entry if it is already saved (so
// opening your own link again does not turn it into a received challenge and
// a completed challenge stays completed). Newest first.
export function upsertChallenge(list, payload, role, now = Date.now()) {
  if (!decodeChallenge(payload).ok) return list
  if (list.some((e) => e.payload === payload)) return list
  const entry = { payload, role, addedAt: new Date(now).toISOString(), completedAt: null }
  return [entry, ...list].slice(0, MAX_CHALLENGES)
}

// Records the first completion; later completions keep the original date.
export function markChallengeCompleted(list, payload, at) {
  let found = false
  const next = list.map((e) => {
    if (e.payload !== payload) return e
    found = true
    return e.completedAt ? e : { ...e, completedAt: new Date(at).toISOString() }
  })
  if (found) return next
  return upsertChallenge(list, payload, 'received', at).map((e) =>
    e.payload === payload ? { ...e, completedAt: new Date(at).toISOString() } : e,
  )
}

export function removeChallenge(list, payload) {
  return list.filter((e) => e.payload !== payload)
}

export function findChallenge(list, payload) {
  return list.find((e) => e.payload === payload) ?? null
}
