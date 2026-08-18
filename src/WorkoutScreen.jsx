import { FighterPortrait } from './FighterPortrait'
import { uncoverInset } from './reveal.js'
import { formatClock, formatDuration, formatRoundCount } from './workout'
import { useWorkoutTimer } from './useWorkoutTimer'
import { useWorkoutSounds } from './audio'
import './WorkoutScreen.css'

function RevealArt({ src, progress, name }) {
  const uncovered = Math.min(1, Math.max(0, progress))
  const percent = Math.round(uncovered * 100)

  return (
    <div
      className="reveal-stage"
      aria-label={`${name} artwork reveal ${percent}%`}
    >
      <div className="reveal-void" />
      <div
        className="reveal-uncover"
        style={{
          clipPath: uncoverInset(uncovered),
          WebkitClipPath: uncoverInset(uncovered),
        }}
      >
        <FighterPortrait src={src} alt="" className="reveal-live-paint" />
        <div className="reveal-grain" />
        {uncovered > 0 && uncovered < 1 ? <div className="reveal-scan" /> : null}
      </div>
      <p className="reveal-meter">{percent}% REVEALED</p>
    </div>
  )
}

function phaseLabel(phase, beat) {
  if (phase === 'intro') return beat?.label ?? 'READY'
  if (phase === 'work') return 'WORK'
  if (phase === 'rest') return 'REST'
  if (phase === 'announce') return 'NEXT ROUND'
  return ''
}

function displayValue({ phase, beat, remainingMs, round }) {
  if (phase === 'intro') return beat?.display ?? 'READY'
  if (phase === 'announce') return `ROUND ${round}`
  return formatClock(remainingMs)
}

export function WorkoutScreen({ session, soundOn, onSoundChange, onExit }) {
  const timer = useWorkoutTimer(session)
  useWorkoutSounds(timer, soundOn)
  const paused = timer.paused
  const finished = timer.status === 'complete' || timer.status === 'stopped'
  const workDoneSec = Math.round((timer.reveal * timer.totalWorkMs) / 1000)
  const percent = Math.round(timer.reveal * 100)

  return (
    <main
      className={`fight phase-${timer.phase}${paused ? ' is-paused' : ''}`}
      data-cue={timer.cue}
    >
      <div className="fight-frame">
        <div className="fight-top">
          <p className="fight-brand">C24 CARDIO</p>
          <button
            type="button"
            className={`sound-toggle${soundOn ? ' is-on' : ''}`}
            aria-pressed={soundOn}
            onClick={() => onSoundChange(!soundOn)}
          >
            SOUND {soundOn ? 'ON' : 'OFF'}
          </button>
        </div>

        {timer.status === 'complete' ? (
          <>
            <h2 className="finish-title finish-title-lead">WORKOUT COMPLETE</h2>
            <RevealArt
              src={session.fighter.imageUrl || session.fighter.artwork}
              progress={1}
              name={session.fighter.name}
            />
            <div className="finish-card">
              <p className="finish-message">YOU EARNED THE REVEAL.</p>
              <div className="finish-stats">
                <div>
                  <span>WORK</span>
                  <strong>{formatDuration(workDoneSec)}</strong>
                </div>
                <div>
                  <span>ROUNDS</span>
                  <strong>{formatRoundCount(session.rounds)}</strong>
                </div>
              </div>
              <p className="finish-sub">{formatRoundCount(session.rounds)} COMPLETE</p>
              <button type="button" className="fight-primary" onClick={onExit}>
                NEW WORKOUT
              </button>
            </div>
          </>
        ) : (
          <RevealArt
            src={session.fighter.imageUrl || session.fighter.artwork}
            progress={timer.reveal}
            name={session.fighter.name}
          />
        )}

        {timer.status === 'complete' ? null : !finished ? (
          <>
            <p className={`fight-mode mode-${timer.phase}`}>
              {paused ? 'PAUSED' : phaseLabel(timer.phase, timer.beat)}
            </p>
            <p
              key={`${timer.phase}-${timer.beat?.display ?? timer.round}`}
              className={`fight-clock${timer.phase === 'intro' || timer.phase === 'announce' ? ' is-callout' : ''}`}
            >
              {displayValue(timer)}
            </p>
            <p className="fight-round">
              ROUND {Math.min(timer.round, session.rounds)} / {session.rounds}
            </p>
            <p className="fight-name">{session.fighter.name}</p>
            <div className="fight-controls">
              {paused ? (
                <button
                  type="button"
                  className="fight-primary"
                  onClick={timer.resume}
                  disabled={timer.confirmStop}
                >
                  RESUME
                </button>
              ) : (
                <button type="button" className="fight-primary" onClick={timer.pause}>
                  PAUSE
                </button>
              )}
              <button type="button" className="fight-ghost" onClick={timer.requestStop}>
                STOP WORKOUT
              </button>
            </div>
          </>
        ) : (
          <div className="finish-card">
            <p className="finish-kicker">CUT SHORT</p>
            <h2 className="finish-title">REVEAL LOCKED</h2>
            <p className="finish-message">
              THE ART STAYS WHERE YOU STOPPED. COME BACK AND FINISH IT.
            </p>
            <div className="finish-stats">
              <div>
                <span>WORK</span>
                <strong>{formatDuration(workDoneSec)}</strong>
              </div>
              <div>
                <span>REVEAL</span>
                <strong>{percent}%</strong>
              </div>
            </div>
            <p className="finish-sub">{formatRoundCount(session.rounds)} PROGRAMMED</p>
            <button type="button" className="fight-primary" onClick={onExit}>
              NEW WORKOUT
            </button>
          </div>
        )}
      </div>

      {timer.confirmStop ? (
        <div className="fight-modal" role="dialog" aria-modal="true" aria-labelledby="stop-title">
          <div className="fight-dialog">
            <p id="stop-title" className="dialog-title">
              END WORKOUT?
            </p>
            <p className="dialog-copy">The reveal will lock at your current work progress.</p>
            <button type="button" className="fight-ghost" onClick={timer.confirmEnd}>
              END AND LOCK REVEAL
            </button>
            <button type="button" className="fight-primary" onClick={timer.cancelStop}>
              KEEP GOING
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
