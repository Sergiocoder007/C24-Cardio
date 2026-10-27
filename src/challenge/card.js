// Draws the shareable C24 Challenge cards as real PNG images (1080 × 1350,
// the 4:5 size WhatsApp, Instagram feed and most chat apps show uncropped).
//
//   kind 'challenge': the invitation, with ACCEPT THE CHALLENGE and the
//                     challenge code (the link itself goes in the share text).
//   kind 'completed': CHALLENGE COMPLETED with the workout and completion date
//                     (self-reported, and the card says so).

import logoUrl from '../assets/brand/c24-logo.png'
import {
  LEVEL_NAMES,
  STYLE_NAMES,
  cardDeadline,
  challengeTitle,
  formatDay,
  localDay,
} from './challenge.js'
import { formatDuration } from '../workout.js'

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

const ORANGE = '#ff6a00'
const ORANGE_SOFT = '#ff8533'
const BG = '#050505'
const PANEL = '#121212'
const LINE = '#2a2a2a'
const TEXT = '#f4f4f4'
const MUTED = '#9a9a9a'
const FONT = '"Oswald Variable", Oswald, "Bebas Neue", "DIN Condensed", "Arial Narrow", Impact, sans-serif'

function font(weight, size) {
  return `${weight} ${size}px ${FONT}`
}

// Letter-spaced text. Uses the canvas letterSpacing property where the
// WebView supports it, otherwise places characters one by one.
function spacedText(ctx, text, x, y, spacing, align = 'left') {
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`
    const w = ctx.measureText(text).width - spacing
    const start = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
    ctx.textAlign = 'left'
    ctx.fillText(text, start, y)
    ctx.letterSpacing = '0px'
    return w
  }
  const chars = Array.from(text)
  const widths = chars.map((c) => ctx.measureText(c).width)
  const w = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
  ctx.textAlign = 'left'
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y)
    cx += widths[i] + spacing
  })
  return w
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawBackground(ctx) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  const glow = ctx.createRadialGradient(CARD_WIDTH * 0.92, 80, 20, CARD_WIDTH * 0.92, 80, 900)
  glow.addColorStop(0, 'rgba(255, 106, 0, 0.34)')
  glow.addColorStop(0.45, 'rgba(255, 106, 0, 0.08)')
  glow.addColorStop(1, 'rgba(255, 106, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  const low = ctx.createRadialGradient(0, CARD_HEIGHT, 10, 0, CARD_HEIGHT, 700)
  low.addColorStop(0, 'rgba(255, 106, 0, 0.16)')
  low.addColorStop(1, 'rgba(255, 106, 0, 0)')
  ctx.fillStyle = low
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Hazard stripes along the bottom edge, echoing the logo.
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, CARD_HEIGHT - 26, CARD_WIDTH, 26)
  ctx.clip()
  ctx.fillStyle = ORANGE
  for (let x = -40; x < CARD_WIDTH + 40; x += 56) {
    ctx.beginPath()
    ctx.moveTo(x, CARD_HEIGHT)
    ctx.lineTo(x + 28, CARD_HEIGHT)
    ctx.lineTo(x + 54, CARD_HEIGHT - 26)
    ctx.lineTo(x + 26, CARD_HEIGHT - 26)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // Frame.
  roundRect(ctx, 28, 28, CARD_WIDTH - 56, CARD_HEIGHT - 84, 44)
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255, 106, 0, 0.55)'
  ctx.stroke()
}

// Fixed layout (y positions on the 1080 × 1350 card), so nothing can overlap
// whatever the title, name or numbers are.
const L = {
  kicker: 282,
  titleTop: 312,
  titleMaxSize: 150,
  chips: 476,
  stats: 580,
  statsHeight: 150,
  label: 790,
  value: 850,
  cta: 888,
  ctaHeight: 116,
  footer: 1046,
}
const LEFT = 76
const INNER = CARD_WIDTH - LEFT * 2

function drawHeader(ctx, logo) {
  if (logo) ctx.drawImage(logo, LEFT - 12, 56, 150, 150)
  ctx.fillStyle = TEXT
  ctx.textBaseline = 'alphabetic'
  ctx.font = font(700, 62)
  spacedText(ctx, 'C24 CARDIO', LEFT + 154, 154, 9)
}

function drawKicker(ctx, text) {
  ctx.fillStyle = ORANGE
  ctx.fillRect(LEFT, L.kicker - 12, 44, 5)
  let size = 34
  ctx.font = font(600, size)
  while (measureSpaced(ctx, text, 8) > INNER - 60 && size > 22) {
    size -= 1
    ctx.font = font(600, size)
  }
  spacedText(ctx, text, LEFT + 60, L.kicker, 8)
}

function measureSpaced(ctx, text, spacing) {
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`
    const w = ctx.measureText(text).width - spacing
    ctx.letterSpacing = '0px'
    return w
  }
  return ctx.measureText(text).width + spacing * (Array.from(text).length - 1)
}

// Pills on one row; the text shrinks until the whole row fits.
function drawChips(ctx, labels, y) {
  const gap = 14
  let size = 30
  let pad = 28
  const total = () => labels.reduce((sum, l) => sum + measureSpaced(ctx, l, 5) + pad * 2, 0) + gap * (labels.length - 1)
  ctx.font = font(600, size)
  while (total() > INNER && size > 18) {
    size -= 1
    pad = Math.max(18, pad - 1)
    ctx.font = font(600, size)
  }
  let x = LEFT
  labels.forEach((label, i) => {
    const w = measureSpaced(ctx, label, 5) + pad * 2
    roundRect(ctx, x, y, w, 64, 32)
    if (i === 0) {
      ctx.fillStyle = ORANGE
      ctx.fill()
      ctx.fillStyle = '#0a0a0a'
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255, 106, 0, 0.8)'
      ctx.stroke()
      ctx.fillStyle = TEXT
    }
    spacedText(ctx, label, x + pad, y + 32 + size * 0.36, 5)
    x += w + gap
  })
}

function drawStats(ctx, c) {
  const y = L.stats
  const h = L.statsHeight
  const tiles = [
    ['ROUNDS', String(c.rounds)],
    ['ROUND', formatDuration(c.roundDurationSec)],
    ['REST', c.restDurationSec === 0 || c.rounds === 1 ? 'NONE' : formatDuration(c.restDurationSec)],
  ]
  const gap = 18
  const w = (INNER - gap * 2) / 3
  tiles.forEach(([label, value], i) => {
    const x = LEFT + i * (w + gap)
    roundRect(ctx, x, y, w, h, 26)
    ctx.fillStyle = PANEL
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = LINE
    ctx.stroke()
    ctx.fillStyle = MUTED
    ctx.font = font(500, 26)
    spacedText(ctx, label, x + w / 2, y + 48, 6, 'center')
    ctx.fillStyle = i === 0 ? ORANGE : TEXT
    let size = 68
    ctx.font = font(700, size)
    while (ctx.measureText(value).width > w - 36 && size > 30) {
      size -= 2
      ctx.font = font(700, size)
    }
    ctx.textAlign = 'center'
    ctx.fillText(value, x + w / 2, y + 116)
    ctx.textAlign = 'left'
  })
}

function drawFooter(ctx, code, line2) {
  const y = L.footer
  ctx.fillStyle = MUTED
  ctx.font = font(500, 28)
  spacedText(ctx, 'CHALLENGE CODE', LEFT, y + 40, 7)
  ctx.fillStyle = ORANGE
  ctx.font = font(700, 64)
  spacedText(ctx, `#${code.toUpperCase()}`, LEFT, y + 112, 8)
  ctx.fillStyle = ORANGE_SOFT
  ctx.font = font(500, 32)
  spacedText(ctx, 'c24cardio.fit', CARD_WIDTH - LEFT, y + 62, 2, 'right')
  ctx.fillStyle = MUTED
  ctx.font = font(400, 26)
  spacedText(ctx, line2, CARD_WIDTH - LEFT, y + 108, 2, 'right')
}

// One line, as large as fits (up to maxSize).
function drawTitle(ctx, text, top, maxSize = L.titleMaxSize) {
  let size = maxSize
  ctx.font = font(700, size)
  while (ctx.measureText(text).width > INNER && size > 50) {
    size -= 2
    ctx.font = font(700, size)
  }
  ctx.fillStyle = TEXT
  // Centre the cap height in the space reserved for the largest title.
  const baseline = top + maxSize * 0.86 - (maxSize - size) * 0.43
  ctx.fillText(text, LEFT - 4, baseline)
}

function drawCta(ctx, label, filled = true) {
  const y = L.cta
  const h = L.ctaHeight
  roundRect(ctx, LEFT, y, INNER, h, h / 2)
  if (filled) {
    const grad = ctx.createLinearGradient(LEFT, y, LEFT + INNER, y + h)
    grad.addColorStop(0, ORANGE_SOFT)
    grad.addColorStop(1, ORANGE)
    ctx.fillStyle = grad
    ctx.shadowColor = 'rgba(255, 106, 0, 0.5)'
    ctx.shadowBlur = 36
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0a0a0a'
  } else {
    ctx.lineWidth = 4
    ctx.strokeStyle = ORANGE
    ctx.stroke()
    ctx.fillStyle = ORANGE
  }
  ctx.font = font(700, 52)
  spacedText(ctx, label, CARD_WIDTH / 2, y + h / 2 + 18, 7, 'center')
}

function drawDateBlock(ctx, label, value) {
  ctx.fillStyle = MUTED
  ctx.font = font(500, 28)
  spacedText(ctx, label, LEFT, L.label, 7)
  ctx.fillStyle = TEXT
  ctx.font = font(700, 50)
  return spacedText(ctx, value, LEFT, L.value, 3)
}

export function drawChallengeCard(ctx, { challenge: c, today, logo }) {
  drawBackground(ctx)
  drawHeader(ctx, logo)
  drawKicker(ctx, c.from ? `${c.from.toUpperCase()} CHALLENGES YOU` : 'YOU’VE BEEN CHALLENGED')
  drawTitle(ctx, challengeTitle(c), L.titleTop)
  drawChips(ctx, [STYLE_NAMES[c.style], LEVEL_NAMES[c.level], `COMBO EVERY ${c.paceSec}S`], L.chips)
  drawStats(ctx, c)
  drawDateBlock(ctx, 'DEADLINE', cardDeadline(c, today))
  drawCta(ctx, 'ACCEPT THE CHALLENGE  ›')
  drawFooter(ctx, c.id, 'Tap the link to accept')
}

export function drawCompletionCard(ctx, { challenge: c, completedAt, logo }) {
  const completedDay = localDay(completedAt)
  const onTime = completedDay <= c.deadline
  drawBackground(ctx)
  drawHeader(ctx, logo)
  drawKicker(ctx, 'C24 CHALLENGE')
  drawTitle(ctx, 'CHALLENGE COMPLETED', L.titleTop, 128)

  // Check badge + what was completed, on the chip row.
  const cy = L.chips + 32
  ctx.beginPath()
  ctx.arc(LEFT + 32, cy, 32, 0, Math.PI * 2)
  ctx.fillStyle = ORANGE
  ctx.shadowColor = 'rgba(255, 106, 0, 0.6)'
  ctx.shadowBlur = 28
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.moveTo(LEFT + 17, cy + 1)
  ctx.lineTo(LEFT + 28, cy + 13)
  ctx.lineTo(LEFT + 48, cy - 11)
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#0a0a0a'
  ctx.stroke()
  const sub = `${challengeTitle(c)} · ${LEVEL_NAMES[c.level]}`
  let size = 40
  ctx.font = font(600, size)
  while (measureSpaced(ctx, sub, 4) > INNER - 90 && size > 24) {
    size -= 1
    ctx.font = font(600, size)
  }
  ctx.fillStyle = TEXT
  spacedText(ctx, sub, LEFT + 90, cy + size * 0.36, 4)

  drawStats(ctx, c)
  const w = drawDateBlock(ctx, 'COMPLETED', formatDay(completedDay))
  if (onTime) {
    ctx.font = font(600, 26)
    const label = 'ON TIME'
    const pw = measureSpaced(ctx, label, 5) + 40
    roundRect(ctx, LEFT + w + 28, L.value - 40, pw, 50, 25)
    ctx.lineWidth = 2
    ctx.strokeStyle = ORANGE
    ctx.stroke()
    ctx.fillStyle = ORANGE
    spacedText(ctx, label, LEFT + w + 48, L.value - 6, 5)
  }
  drawCta(ctx, 'THINK YOU CAN DO IT?', false)
  drawFooter(ctx, c.id, 'Self-reported in C24 Cardio')
}

let logoPromise = null
function loadLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null) // card still renders without it
      img.src = logoUrl
    })
  }
  return logoPromise
}

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(font(700, 100)),
      document.fonts.load(font(600, 40)),
      document.fonts.load(font(500, 40)),
      document.fonts.load(font(400, 40)),
    ])
  } catch {
    // fall back to the system condensed font
  }
}

// Renders a card and returns { dataUrl, fileName }.
export async function renderCard(kind, { challenge, completedAt, now = Date.now() }) {
  const [logo] = await Promise.all([loadLogo(), fontsReady()])
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (kind === 'completed') drawCompletionCard(ctx, { challenge, completedAt, logo })
  else drawChallengeCard(ctx, { challenge, today: localDay(now), logo })
  const dataUrl = canvas.toDataURL('image/png')
  const fileName = `c24-${kind === 'completed' ? 'challenge-completed' : 'challenge'}-${challenge.id}.png`
  return { dataUrl, fileName }
}
