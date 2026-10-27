import { useEffect, useRef } from 'react'
import logoUrl from './assets/brand/c24-logo.png'
import { useWorkoutSounds } from './audio'
import { formatTrainingTime, plural } from './history.js'
import { useKeepAwake } from './keepAwake.js'
import { useWorkoutTimer } from './useWorkoutTimer'
import { formatClock } from './workout'
import './WorkoutScreen.css'

function phaseLabel(timer) {
  if (timer.paused) return 'PAUSED'
  if (timer.phase === 'intro') return timer.beat?.label ?? 'READY'
  if (timer.phase === 'work') return 'WORK'
  if (timer.phase === 'rest') return 'REST'
  if (timer.phase === 'announce') return 'NEXT ROUND'
  return ''
}

function displayValue(timer) {
  if (timer.phase === 'intro') return timer.beat?.display ?? 'READY'
  if (timer.phase === 'announce') return `ROUND ${timer.round}`
  return formatClock(timer.remainingMs)
}

function CompleteView({ session, stats, onDone }) {
  return (
    <section className="complete" aria-live="polite">
      <p className="phase-label">WORKOUT COMPLETE</p>
      <h2 className="complete-title">GOOD WORK.</h2>
      <div className="complete-grid">
        <div>
          <span>ROUNDS</span>
          <strong>{session.rounds}</strong>
        </div>
        <div>
          <span>TRAINING TIME</span>
          <strong>{formatTrainingTime(session.rounds * session.roundDurationSec)}</strong>
        </div>
        <div>
          <span>STREAK</span>
          <strong>{plural(stats.streak, 'DAY')}</strong>
        </div>
        <div>
          <span>TODAY</span>
          <strong>{plural(stats.totals.today.rounds, 'ROUND')}</strong>
        </div>
      </div>
      <p className="complete-note">{stats.streakMessage}</p>
      <button type="button" className="btn-primary" onClick={onDone}>
        DONE
      </button>
    </section>
  )
}

export function WorkoutScreen({ session, soundOn, onSoundChange, onComplete, onExit, stats, backRequest }) {
  const timer = useWorkoutTimer(session)
  const { needsTap } = useWorkoutSounds(timer, soundOn)
  const running = timer.status === 'running'
  useKeepAwake(running && !timer.paused)

  // Save the session exactly once, when the last round finishes.
  const saved = useRef(false)
  useEffect(() => {
    if (timer.status === 'complete' && !saved.current) {
      saved.current = true
      onComplete(timer.completedAt ?? Date.now())
    }
    if (timer.status === 'stopped') onExit()
  }, [timer.status, timer.completedAt, onComplete, onExit])

  // Android back button: ask before abandoning a workout.
  const lastBack = useRef(backRequest)
  useEffect(() => {
    if (backRequest === lastBack.current) return
    lastBack.current = backRequest
    if (timer.status === 'complete') onExit()
    else if (timer.confirmStop) timer.cancelStop()
    else timer.requestStop()
  }, [backRequest, timer, onExit])

  const isGo = timer.phase === 'intro' || timer.phase === 'announce'
  const glow = timer.phase === 'rest' ? 'is-rest' : timer.phase === 'work' ? 'is-work' : 'is-intro'

  return (
    <main className={`workout ${glow}${timer.paused ? ' is-paused' : ''}`}>
      <div className={`screen-frame workout-frame${timer.confirmStop ? ' is-dimmed' : ''}`}>
        <header className="workout-top">
          <div className="workout-brand">
            <img className="workout-mark" src={logoUrl} alt="" />
            <p className="brand-word workout-word">C24 CARDIO</p>
          </div>
          <button
            type="button"
            className={`sound-btn${soundOn ? ' is-on' : ''}`}
            aria-pressed={soundOn}
            onClick={() => onSoundChange(!soundOn)}
          >
            SOUND {soundOn ? 'ON' : 'OFF'}
          </button>
        </header>

        {needsTap && running ? (
          <button type="button" className="sound-banner" onClick={() => onSoundChange(true)}>
            YOUR PHONE PAUSED THE SOUND · TAP TO TURN IT BACK ON
          </button>
        ) : null}

        {timer.status === 'complete' ? (
          <CompleteView session={session} stats={stats} onDone={onExit} />
        ) : (
          <>
            <section className="clock-block" aria-live="off">
              <p className="phase-label">{phaseLabel(timer)}</p>
              <p
                key={`${timer.phase}-${timer.beat?.display ?? timer.round}`}
                className={`clock${isGo ? ' is-callout' : ''}${timer.beat?.display === 'GO' ? ' is-go' : ''}`}
              >
                {displayValue(timer)}
              </p>
              <p className="round-count">
                ROUND {Math.min(timer.round, session.rounds)} / {session.rounds}
              </p>
            </section>

            <div className="workout-controls">
              {timer.paused ? (
                <button type="button" className="btn-primary" onClick={timer.resume} disabled={timer.confirmStop}>
                  RESUME
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={timer.pause}>
                  PAUSE
                </button>
              )}
              <button type="button" className="btn-outline" onClick={timer.requestStop}>
                STOP WORKOUT
              </button>
            </div>
          </>
        )}
      </div>

      {timer.confirmStop ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="end-title">
          <div className="dialog">
            <p id="end-title" className="dialog-title">
              END WORKOUT?
            </p>
            <p className="dialog-copy">This session will not be saved.</p>
            <button type="button" className="btn-outline" onClick={timer.confirmEnd}>
              END WORKOUT
            </button>
            <button type="button" className="btn-primary" onClick={timer.cancelStop} autoFocus>
              KEEP GOING
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
