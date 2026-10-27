// Combo library for Training mode. REVISED — awaiting owner's final approval (see COMBOS.md).
//
// Each move has an id (also the ElevenLabs clip file name: public/voice/<id>.mp3),
// the words spoken, and a short on-screen label. Terminology (orthodox stance):
//   jab / cross            lead / rear straight
//   hook / rear hook       lead hook unless "rear" is said
//   lead / rear uppercut   always named with the side
//   ... to body            the same punch aimed at the body ("jab to body")
//   teep / rear teep       lead push kick unless "rear" is said
//   low / body / head kick rear-leg roundhouse kicks
//   switch kick            lead-leg roundhouse after a quick stance switch
//   knee / switch knee     rear knee / lead knee after a switch
//   lead / rear elbow      always named with the side

export const MOVES = {
  // Boxing
  jab: { say: 'Jab', label: 'JAB' },
  'double-jab': { say: 'Double jab', label: 'DOUBLE JAB' },
  cross: { say: 'Cross', label: 'CROSS' },
  hook: { say: 'Hook', label: 'HOOK' },
  'rear-hook': { say: 'Rear hook', label: 'REAR HOOK' },
  'lead-uppercut': { say: 'Lead uppercut', label: 'LEAD UPPERCUT' },
  'rear-uppercut': { say: 'Rear uppercut', label: 'REAR UPPERCUT' },
  'jab-body': { say: 'Jab to body', label: 'JAB TO BODY' },
  'hook-body': { say: 'Hook to body', label: 'HOOK TO BODY' },
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
  'lead-elbow': { say: 'Lead elbow', label: 'LEAD ELBOW' },
  'rear-elbow': { say: 'Rear elbow', label: 'REAR ELBOW' },
  check: { say: 'Check', label: 'CHECK' },
  clinch: { say: 'Clinch', label: 'CLINCH' },
}

const c = (...moves) => moves

export const COMBOS = {
  boxing: {
    // 1–3 moves: straight punches, lead hook, one uppercut, one body shot.
    beginner: [
      c('jab'),
      c('double-jab'),
      c('jab', 'cross'),
      c('double-jab', 'cross'),
      c('jab', 'cross', 'hook'),
      c('cross', 'hook', 'cross'),
      c('jab', 'rear-uppercut'),
      c('jab', 'cross', 'jab'),
      c('hook', 'cross'),
      c('jab', 'jab-body'),
      c('cross', 'hook'),
      c('jab', 'cross', 'lead-uppercut'),
    ],
    // 3–4 moves: body shots, both uppercuts, slip / roll / block.
    intermediate: [
      c('jab', 'cross', 'hook', 'cross'),
      c('jab', 'hook-body', 'hook'),
      c('double-jab', 'cross', 'hook'),
      c('slip', 'cross', 'hook', 'cross'),
      c('jab', 'cross', 'roll', 'hook'),
      c('rear-uppercut', 'hook', 'cross'),
      c('jab', 'cross', 'lead-uppercut', 'cross'),
      c('jab-body', 'jab', 'cross'),
      c('hook-body', 'hook', 'cross'),
      c('jab', 'rear-uppercut', 'hook'),
      c('cross', 'hook', 'rear-uppercut'),
      c('jab', 'cross', 'block', 'cross'),
    ],
    // 4–6 moves: longer chains that alternate hands, with defence and footwork.
    advanced: [
      c('jab', 'cross', 'hook', 'roll', 'hook', 'cross'),
      c('slip', 'slip', 'cross', 'hook', 'rear-uppercut'),
      c('jab', 'hook-body', 'hook', 'cross', 'pivot'),
      c('double-jab', 'overhand', 'hook', 'rear-uppercut'),
      c('jab', 'cross', 'lead-uppercut', 'rear-hook', 'step-back'),
      c('hook', 'rear-uppercut', 'hook', 'cross'),
      c('jab-body', 'cross', 'hook-body', 'hook', 'cross'),
      c('jab', 'cross', 'roll', 'cross', 'hook', 'cross'),
      c('slip', 'rear-uppercut', 'hook', 'cross', 'roll'),
      c('double-jab', 'cross', 'hook', 'rear-uppercut', 'hook'),
      c('block', 'cross', 'hook', 'cross', 'pivot'),
      c('overhand', 'hook-body', 'hook', 'rear-uppercut'),
    ],
  },
  muaythai: {
    // 1–3 moves: punches, teeps, rear kicks and the rear knee. No elbows or clinch.
    beginner: [
      c('teep'),
      c('jab', 'teep'),
      c('jab', 'hook', 'low-kick'),
      c('cross', 'hook', 'low-kick'),
      c('jab', 'body-kick'),
      c('jab', 'low-kick'),
      c('low-kick', 'cross'),
      c('jab', 'cross', 'knee'),
      c('teep', 'cross'),
      c('hook', 'body-kick'),
      c('jab', 'hook', 'body-kick'),
      c('double-jab', 'low-kick'),
    ],
    // 3–4 moves: switch kicks and knees, elbows, check and clinch.
    intermediate: [
      c('jab', 'cross', 'hook', 'low-kick'),
      c('teep', 'cross', 'hook', 'body-kick'),
      c('jab', 'switch-kick', 'cross'),
      c('check', 'cross', 'hook'),
      c('lead-elbow', 'rear-elbow', 'knee'),
      c('jab', 'cross', 'switch-knee'),
      c('double-jab', 'hook', 'low-kick'),
      c('cross', 'hook', 'head-kick'),
      c('clinch', 'knee', 'switch-knee'),
      c('rear-teep', 'jab', 'cross', 'hook'),
      c('jab', 'hook', 'low-kick', 'cross'),
      c('cross', 'lead-elbow', 'knee'),
    ],
    // 4–6 moves: alternating sides, kicks to all three levels, elbows into knees.
    advanced: [
      c('jab', 'cross', 'hook', 'low-kick', 'hook', 'head-kick'),
      c('rear-teep', 'switch-kick', 'cross', 'hook', 'low-kick'),
      c('double-jab', 'cross', 'switch-knee', 'rear-elbow'),
      c('check', 'cross', 'hook', 'body-kick', 'teep'),
      c('jab', 'cross', 'lead-elbow', 'rear-elbow', 'knee'),
      c('low-kick', 'hook', 'cross', 'switch-kick'),
      c('clinch', 'knee', 'switch-knee', 'lead-elbow', 'teep'),
      c('jab', 'switch-kick', 'cross', 'hook', 'head-kick'),
      c('rear-teep', 'jab', 'cross', 'hook', 'body-kick'),
      c('hook', 'cross', 'hook', 'low-kick', 'cross'),
      c('slip', 'cross', 'lead-elbow', 'knee', 'teep'),
      c('jab', 'cross', 'hook', 'cross', 'switch-kick', 'rear-teep'),
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
