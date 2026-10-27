import { DEFAULT_SETUP, REST_DURATION_LIMITS, ROUND_COUNT_LIMITS, ROUND_DURATION_LIMITS } from './workout.js'

export const SETTINGS_KEY = 'c24.settings.v1'

function inRange(value, { min, max }) {
  return Number.isFinite(value) && value >= min && value <= max
}

export function parseSettings(raw) {
  const fallback = { setup: { ...DEFAULT_SETUP }, soundOn: true }
  if (!raw) return fallback
  try {
    const data = JSON.parse(raw)
    const s = data?.setup ?? {}
    return {
      setup: {
        rounds: inRange(s.rounds, ROUND_COUNT_LIMITS) ? s.rounds : DEFAULT_SETUP.rounds,
        roundsCustom: Boolean(s.roundsCustom),
        roundDurationSec: inRange(s.roundDurationSec, ROUND_DURATION_LIMITS) ? s.roundDurationSec : DEFAULT_SETUP.roundDurationSec,
        roundDurationCustom: Boolean(s.roundDurationCustom),
        restDurationSec: inRange(s.restDurationSec, REST_DURATION_LIMITS) ? s.restDurationSec : DEFAULT_SETUP.restDurationSec,
        restDurationCustom: Boolean(s.restDurationCustom),
      },
      soundOn: data?.soundOn !== false,
    }
  } catch {
    return fallback
  }
}

export function loadSettings(storage) {
  try {
    return parseSettings(storage?.getItem(SETTINGS_KEY))
  } catch {
    return parseSettings(null)
  }
}

export function saveSettings(storage, settings) {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // storage unavailable (private mode / quota) — settings stay in memory
  }
}
