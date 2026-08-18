import assert from 'node:assert/strict'
import test from 'node:test'
import { FIGHTERS, filterFighters } from './fighters.js'
import { uncoverInset, workRevealProgress } from './reveal.js'

test('roster has exactly 20 UFC fighters', () => {
  assert.equal(FIGHTERS.length, 20)
  assert.ok(FIGHTERS.every((fighter) => fighter.id && fighter.name && fighter.imageUrl && fighter.division))
})

test('empty or short queries return no fighters', () => {
  assert.deepEqual(filterFighters(''), [])
  assert.deepEqual(filterFighters('J'), [])
})

test('filter returns only Islam Makhachev for Islam', () => {
  const results = filterFighters('Islam')
  assert.deepEqual(results.map((fighter) => fighter.name), ['Islam Makhachev'])
})

test('filter returns only Jon Jones for Jones', () => {
  const results = filterFighters('Jones')
  assert.deepEqual(results.map((fighter) => fighter.name), ['Jon Jones'])
})

test('filter returns only Khabib Nurmagomedov for Khabib', () => {
  const results = filterFighters('Khabib')
  assert.deepEqual(results.map((fighter) => fighter.name), ['Khabib Nurmagomedov'])
})

test('filter returns only Alex Pereira for Pereira', () => {
  const results = filterFighters('Pereira')
  assert.deepEqual(results.map((fighter) => fighter.name), ['Alex Pereira'])
})

test('filter caps results at 5', () => {
  const results = filterFighters('al')
  assert.ok(results.length > 0)
  assert.ok(results.length <= 5)
})

test('work reveal is 0 at start and ignores rest/pause', () => {
  const totalWorkMs = 5 * 3 * 60 * 1000
  const roundDurationMs = 3 * 60 * 1000

  assert.equal(
    workRevealProgress({
      status: 'running',
      phase: 'intro',
      completedWorkMs: 0,
      workElapsedMs: 0,
      roundDurationMs,
      totalWorkMs,
      frozenReveal: 0,
    }),
    0,
  )

  assert.equal(
    workRevealProgress({
      status: 'running',
      phase: 'work',
      completedWorkMs: 0,
      workElapsedMs: roundDurationMs,
      roundDurationMs,
      totalWorkMs,
      frozenReveal: 0,
    }),
    0.2,
  )

  assert.equal(
    workRevealProgress({
      status: 'running',
      phase: 'rest',
      completedWorkMs: roundDurationMs,
      workElapsedMs: 60 * 1000,
      roundDurationMs,
      totalWorkMs,
      frozenReveal: 0,
    }),
    0.2,
  )

  assert.equal(
    workRevealProgress({
      status: 'running',
      phase: 'work',
      completedWorkMs: roundDurationMs,
      workElapsedMs: 0,
      roundDurationMs,
      totalWorkMs,
      frozenReveal: 0,
    }),
    0.2,
  )

  assert.equal(
    workRevealProgress({
      status: 'running',
      phase: 'work',
      completedWorkMs: 2 * roundDurationMs,
      workElapsedMs: 1.5 * 60 * 1000,
      roundDurationMs,
      totalWorkMs,
      frozenReveal: 0,
    }),
    0.5,
  )
})

test('pause and stop freeze reveal; completion is 100%', () => {
  const totalWorkMs = 10000
  const roundDurationMs = 10000
  const paused = workRevealProgress({
    status: 'running',
    phase: 'work',
    completedWorkMs: 0,
    workElapsedMs: 4300,
    roundDurationMs,
    totalWorkMs,
    frozenReveal: 0,
  })
  assert.equal(paused, 0.43)

  assert.equal(
    workRevealProgress({
      status: 'stopped',
      phase: 'stopped',
      completedWorkMs: 0,
      workElapsedMs: totalWorkMs,
      roundDurationMs,
      totalWorkMs,
      frozenReveal: 0.43,
    }),
    0.43,
  )

  assert.equal(
    workRevealProgress({
      status: 'complete',
      phase: 'complete',
      completedWorkMs: totalWorkMs,
      workElapsedMs: roundDurationMs,
      roundDurationMs,
      totalWorkMs,
      frozenReveal: 0.43,
    }),
    1,
  )
})

test('clip-path starts fully covered and opens from the bottom', () => {
  assert.equal(uncoverInset(0), 'inset(100% 0 0 0)')
  assert.equal(uncoverInset(0.1), 'inset(90% 0 0 0)')
  assert.equal(uncoverInset(0.5), 'inset(50% 0 0 0)')
  assert.equal(uncoverInset(1), 'inset(0% 0 0 0)')
})
