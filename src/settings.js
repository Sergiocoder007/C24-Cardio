import { LEVELS, PACES, STYLES } from './training/combos.js'
import { DEFAULT_SETUP, REST_DURATION_LIMITS, ROUND_COUNT_LIMITS, ROUND_DURATION_LIMITS } from './workout.js'

export const SETTINGS_KEY = 'c24.settings.v1'

export const DEFAULT_TRAINING = { mode: 'sparring', style: 'boxing', level: 'beginner', paceSec: 8 }

function parseTraining(t) {
  return {
    mode: t?.mode === 'training' ? 'training' : 'sparring',
    style: STYLES.includes(t?.style) ? t.style : DEFAULT_TRAINING.style,
    level: LEVELS.includes(t?.level) ? t.level : DEFAULT_TRAINING.level,
    paceSec: PACES.includes(t?.paceSec) ? t.paceSec : DEFAULT_TRAINING.paceSec,
  }
}

function inRange(value, { min, max }) {
  return Number.isFinite(value) && value >= min && value <= max
}

export function parseSettings(raw) {
  const fallback = { setup: { ...DEFAULT_SETUP }, soundOn: true, training: { ...DEFAULT_TRAINING } }
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
      training: parseTraining(data?.training),
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
