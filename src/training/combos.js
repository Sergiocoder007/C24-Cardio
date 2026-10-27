// Combo library for Training mode. PROPOSED — awaiting owner review (see COMBOS.md).
//
// Each move has an id (also the future ElevenLabs clip file name, e.g.
// voice/body-hook.mp3), the words spoken, and a short on-screen label.
// Orthodox stance: "hook" = lead hook, "rear hook" = right hook, etc.

export const MOVES = {
  // Boxing
  jab: { say: 'Jab', label: 'JAB' },
  'double-jab': { say: 'Double jab', label: 'DOUBLE JAB' },
  cross: { say: 'Cross', label: 'CROSS' },
  hook: { say: 'Hook', label: 'HOOK' },
  'rear-hook': { say: 'Rear hook', label: 'REAR HOOK' },
  uppercut: { say: 'Uppercut', label: 'UPPERCUT' },
  'rear-uppercut': { say: 'Rear uppercut', label: 'REAR UPPERCUT' },
  'body-jab': { say: 'Body jab', label: 'BODY JAB' },
  'body-hook': { say: 'Body hook', label: 'BODY HOOK' },
  overhand: { say: 'Overhand', label: 'OVERHAND' },
  // Defence and footwork
  slip: { say: 'Slip', label: 'SLIP' },
  roll: { say: 'Roll', label: 'ROLL' },
  block: { say: 'Block', label: 'BLOCK' },
  pivot: { say: 'Pivot', label: 'PIVOT' },
  'step-back': { say: 'Step back', label: 'STEP BACK' },
  // Muay Thai
  teep: { say: 'Teep', label: 'TEEP' },
  'rear-teep': { say: 'Rear teep', label: 'REAR TEEP' },
  'low-kick': { say: 'Low kick', label: 'LOW KICK' },
  'body-kick': { say: 'Body kick', label: 'BODY KICK' },
  'head-kick': { say: 'Head kick', label: 'HEAD KICK' },
  'switch-kick': { say: 'Switch kick', label: 'SWITCH KICK' },
  knee: { say: 'Knee', label: 'KNEE' },
  'switch-knee': { say: 'Switch knee', label: 'SWITCH KNEE' },
  elbow: { say: 'Elbow', label: 'ELBOW' },
  'rear-elbow': { say: 'Rear elbow', label: 'REAR ELBOW' },
  check: { say: 'Check', label: 'CHECK' },
  clinch: { say: 'Clinch', label: 'CLINCH' },
}

const c = (...moves) => moves

export const COMBOS = {
  boxing: {
    beginner: [
      c('jab'),
      c('double-jab'),
      c('jab', 'cross'),
      c('double-jab', 'cross'),
      c('jab', 'cross', 'hook'),
      c('cross', 'hook', 'cross'),
      c('jab', 'uppercut'),
      c('jab', 'cross', 'jab'),
      c('hook', 'cross'),
      c('jab', 'body-jab'),
      c('cross', 'hook'),
      c('jab', 'cross', 'uppercut'),
    ],
    intermediate: [
      c('jab', 'cross', 'hook', 'cross'),
      c('jab', 'body-hook', 'hook'),
      c('double-jab', 'cross', 'hook'),
      c('slip', 'cross', 'hook', 'cross'),
      c('jab', 'cross', 'roll', 'cross'),
      c('uppercut', 'hook', 'cross'),
      c('jab', 'cross', 'uppercut', 'hook'),
      c('body-jab', 'jab', 'cross'),
      c('hook', 'body-hook', 'cross'),
      c('jab', 'rear-uppercut', 'hook'),
      c('cross', 'hook', 'rear-uppercut'),
      c('jab', 'cross', 'block', 'cross'),
    ],
    advanced: [
      c('jab', 'cross', 'hook', 'roll', 'hook', 'cross'),
      c('slip', 'slip', 'cross', 'hook', 'uppercut'),
      c('jab', 'body-hook', 'hook', 'cross', 'pivot'),
      c('double-jab', 'overhand', 'hook', 'uppercut'),
      c('jab', 'cross', 'uppercut', 'rear-hook', 'step-back'),
      c('hook', 'rear-uppercut', 'hook', 'cross'),
      c('body-jab', 'cross', 'hook', 'body-hook', 'hook'),
      c('jab', 'cross', 'roll', 'cross', 'hook', 'cross'),
      c('slip', 'uppercut', 'hook', 'cross', 'roll'),
      c('jab', 'jab', 'cross', 'hook', 'rear-uppercut', 'hook'),
      c('block', 'cross', 'hook', 'cross', 'pivot'),
      c('overhand', 'hook', 'body-hook', 'uppercut'),
    ],
  },
  muaythai: {
    beginner: [
      c('teep'),
      c('jab', 'teep'),
      c('jab', 'cross', 'low-kick'),
      c('cross', 'hook', 'low-kick'),
      c('jab', 'body-kick'),
      c('knee', 'knee'),
      c('low-kick', 'low-kick'),
      c('jab', 'cross', 'knee'),
      c('teep', 'cross'),
      c('hook', 'body-kick'),
      c('jab', 'elbow'),
      c('cross', 'switch-kick'),
    ],
    intermediate: [
      c('jab', 'cross', 'hook', 'low-kick'),
      c('teep', 'cross', 'body-kick'),
      c('jab', 'switch-kick'),
      c('check', 'cross', 'body-kick'),
      c('elbow', 'rear-elbow', 'knee'),
      c('jab', 'cross', 'switch-knee'),
      c('double-jab', 'cross', 'low-kick'),
      c('hook', 'cross', 'head-kick'),
      c('clinch', 'knee', 'knee', 'elbow'),
      c('rear-teep', 'jab', 'cross', 'hook'),
      c('jab', 'hook', 'low-kick', 'cross'),
      c('cross', 'elbow', 'knee'),
    ],
    advanced: [
      c('jab', 'cross', 'hook', 'low-kick', 'cross', 'head-kick'),
      c('teep', 'switch-kick', 'cross', 'hook', 'low-kick'),
      c('double-jab', 'cross', 'switch-knee', 'elbow'),
      c('check', 'hook', 'cross', 'body-kick', 'teep'),
      c('jab', 'cross', 'elbow', 'rear-elbow', 'knee'),
      c('low-kick', 'cross', 'hook', 'switch-kick'),
      c('clinch', 'knee', 'switch-knee', 'elbow', 'teep'),
      c('jab', 'switch-kick', 'cross', 'hook', 'head-kick'),
      c('rear-teep', 'cross', 'hook', 'body-kick', 'step-back'),
      c('hook', 'cross', 'low-kick', 'low-kick', 'cross'),
      c('slip', 'cross', 'elbow', 'knee', 'teep'),
      c('jab', 'cross', 'hook', 'cross', 'switch-kick', 'teep'),
    ],
  },
}

export const STYLES = ['boxing', 'muaythai', 'mixed']
export const LEVELS = ['beginner', 'intermediate', 'advanced']
export const PACES = [5, 8, 12]

export function combosFor(style, level) {
  if (style === 'mixed') return [...COMBOS.boxing[level], ...COMBOS.muaythai[level]]
  return COMBOS[style]?.[level] ?? []
}

export function spokenText(moves) {
  return moves.map((id) => MOVES[id].say).join(', ')
}

export function displayText(moves) {
  return moves.map((id) => MOVES[id].label).join(' · ')
}
