export const ROUND_COUNT_PRESETS = [1, 2, 3, 5, 10]

export const ROUND_DURATION_PRESETS = [
  { id: '30s', seconds: 30, label: '30 SEC' },
  { id: '1m', seconds: 60, label: '1 MIN' },
  { id: '2m', seconds: 120, label: '2 MIN' },
  { id: '3m', seconds: 180, label: '3 MIN' },
  { id: '5m', seconds: 300, label: '5 MIN' },
]

export const REST_DURATION_PRESETS = [
  { id: '0s', seconds: 0, label: '0 SEC' },
  { id: '30s', seconds: 30, label: '30 SEC' },
  { id: '1m', seconds: 60, label: '1 MIN' },
  { id: '2m', seconds: 120, label: '2 MIN' },
  { id: '3m', seconds: 180, label: '3 MIN' },
]

export const ROUND_COUNT_LIMITS = { min: 1, max: 99 }
export const ROUND_DURATION_LIMITS = { min: 5, max: 3600, step: 5 }
export const REST_DURATION_LIMITS = { min: 0, max: 1800, step: 5 }

export const DEFAULT_SETUP = {
  rounds: 3,
  roundsCustom: false,
  roundDurationSec: 180,
  roundDurationCustom: false,
  restDurationSec: 60,
  restDurationCustom: false,
}

export function formatDuration(totalSeconds) {
  if (totalSeconds <= 0) return '0 SEC'
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} SEC`
  if (seconds === 0) return minutes === 1 ? '1 MIN' : `${minutes} MIN`
  return `${minutes} MIN ${seconds} SEC`
}

export function formatRoundCount(count) {
  return count === 1 ? '1 ROUND' : `${count} ROUNDS`
}

export function buildWorkoutSummary({ rounds, roundDurationSec, restDurationSec }) {
  const workSec = rounds * roundDurationSec
  const restSec = Math.max(0, rounds - 1) * restDurationSec
  return {
    roundsLabel: formatRoundCount(rounds),
    roundDurationLabel: formatDuration(roundDurationSec),
    restLabel: restDurationSec === 0 ? 'NO REST' : `${formatDuration(restDurationSec)} REST`,
    workLabel: formatDuration(workSec),
    sessionLabel: formatDuration(workSec + restSec),
    workSec,
    restSec,
    sessionSec: workSec + restSec,
  }
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
