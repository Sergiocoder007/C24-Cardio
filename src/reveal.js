export function workRevealProgress({
  status,
  phase,
  completedWorkMs,
  workElapsedMs,
  roundDurationMs,
  totalWorkMs,
  frozenReveal,
}) {
  if (status === 'complete') return 1
  if (status === 'stopped') return Math.min(1, Math.max(0, frozenReveal))
  if (!totalWorkMs) return 0

  let workMs = completedWorkMs
  if (phase === 'work') {
    workMs += Math.min(Math.max(0, workElapsedMs), roundDurationMs)
  }

  return Math.min(1, Math.max(0, workMs / totalWorkMs))
}

export function uncoverInset(progress) {
  const hidden = (1 - Math.min(1, Math.max(0, progress))) * 100
  return `inset(${hidden}% 0 0 0)`
}
