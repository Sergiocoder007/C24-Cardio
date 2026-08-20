import { useMemo, useState } from 'react'
import { FighterPortrait } from './FighterPortrait'
import { FIGHTERS, filterFighters, withArtworkFallback } from './fighters'
import {
  ROUND_COUNT_LIMITS,
  ROUND_COUNT_PRESETS,
  ROUND_DURATION_LIMITS,
  ROUND_DURATION_PRESETS,
  REST_DURATION_LIMITS,
  REST_DURATION_PRESETS,
  buildWorkoutSummary,
  clamp,
  formatDuration,
  formatRoundCount,
} from './workout'

function ChoiceChip({ selected, children, onSelect }) {
  return (
    <button
      type="button"
      className={`chip${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {children}
    </button>
  )
}

function Stepper({ label, valueLabel, onDecrease, onIncrease, decreaseDisabled, increaseDisabled }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="stepper-btn"
        onClick={onDecrease}
        disabled={decreaseDisabled}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <p className="stepper-value">{valueLabel}</p>
      <button
        type="button"
        className="stepper-btn"
        onClick={onIncrease}
        disabled={increaseDisabled}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  )
}

export function SetupScreen({
  rounds,
  setRounds,
  roundsCustom,
  setRoundsCustom,
  roundDurationSec,
  setRoundDurationSec,
  roundDurationCustom,
  setRoundDurationCustom,
  restDurationSec,
  setRestDurationSec,
  restDurationCustom,
  setRestDurationCustom,
  selectedFighter,
  setSelectedFighter,
  onReset,
  onStart,
}) {
  const [query, setQuery] = useState('')

  const summary = useMemo(
    () => buildWorkoutSummary({ rounds, roundDurationSec, restDurationSec }),
    [rounds, roundDurationSec, restDurationSec],
  )
  const visibleFighters = useMemo(() => filterFighters(query, FIGHTERS), [query])

  function handleReset() {
    setQuery('')
    onReset()
  }

  return (
    <main className="home">
      <div className="home-frame">
        <header className="brand">
          <p className="brand-kicker">COMBAT CONDITIONING</p>
          <h1 className="logo">
            <span className="logo-mark">C24</span>
            <span className="logo-word">CARDIO</span>
          </h1>
          <p className="tagline">EARN THE REVEAL.</p>
        </header>

        <section className="summary" aria-live="polite">
          <p className="summary-kicker">YOUR SESSION</p>
          <p className="summary-title">
            {summary.roundsLabel} × {summary.roundDurationLabel}
          </p>
          <p className="summary-rest">{summary.restLabel}</p>
          <div className="summary-totals">
            <div>
              <span>WORK</span>
              <strong>{summary.workLabel}</strong>
            </div>
            <div>
              <span>SESSION</span>
              <strong>{summary.sessionLabel}</strong>
            </div>
          </div>
        </section>

        <div className="config-toolbar">
          <p className="config-label config-toolbar-label">WORKOUT SETUP</p>
          <button type="button" className="reset-btn" onClick={handleReset}>
            RESET
          </button>
        </div>

        <section className="config" aria-label="Rounds">
          <p className="config-label">ROUNDS</p>
          <div className="chip-row">
            {ROUND_COUNT_PRESETS.map((count) => (
              <ChoiceChip
                key={count}
                selected={!roundsCustom && rounds === count}
                onSelect={() => {
                  setRounds(count)
                  setRoundsCustom(false)
                }}
              >
                {count}
              </ChoiceChip>
            ))}
            <ChoiceChip selected={roundsCustom} onSelect={() => setRoundsCustom(true)}>
              CUSTOM
            </ChoiceChip>
          </div>
          {roundsCustom ? (
            <Stepper
              label="custom rounds"
              valueLabel={formatRoundCount(rounds)}
              onDecrease={() => setRounds((value) => clamp(value - 1, ROUND_COUNT_LIMITS.min, ROUND_COUNT_LIMITS.max))}
              onIncrease={() => setRounds((value) => clamp(value + 1, ROUND_COUNT_LIMITS.min, ROUND_COUNT_LIMITS.max))}
              decreaseDisabled={rounds <= ROUND_COUNT_LIMITS.min}
              increaseDisabled={rounds >= ROUND_COUNT_LIMITS.max}
            />
          ) : null}
        </section>

        <section className="config" aria-label="Round duration">
          <p className="config-label">ROUND DURATION</p>
          <div className="chip-row">
            {ROUND_DURATION_PRESETS.map((preset) => (
              <ChoiceChip
                key={preset.id}
                selected={!roundDurationCustom && roundDurationSec === preset.seconds}
                onSelect={() => {
                  setRoundDurationSec(preset.seconds)
                  setRoundDurationCustom(false)
                }}
              >
                {preset.label}
              </ChoiceChip>
            ))}
            <ChoiceChip selected={roundDurationCustom} onSelect={() => setRoundDurationCustom(true)}>
              CUSTOM
            </ChoiceChip>
          </div>
          {roundDurationCustom ? (
            <Stepper
              label="custom round duration"
              valueLabel={formatDuration(roundDurationSec)}
              onDecrease={() =>
                setRoundDurationSec((value) =>
                  clamp(value - ROUND_DURATION_LIMITS.step, ROUND_DURATION_LIMITS.min, ROUND_DURATION_LIMITS.max),
                )
              }
              onIncrease={() =>
                setRoundDurationSec((value) =>
                  clamp(value + ROUND_DURATION_LIMITS.step, ROUND_DURATION_LIMITS.min, ROUND_DURATION_LIMITS.max),
                )
              }
              decreaseDisabled={roundDurationSec <= ROUND_DURATION_LIMITS.min}
              increaseDisabled={roundDurationSec >= ROUND_DURATION_LIMITS.max}
            />
          ) : null}
        </section>

        <section className="config" aria-label="Rest duration">
          <p className="config-label">REST DURATION</p>
          <div className="chip-row">
            {REST_DURATION_PRESETS.map((preset) => (
              <ChoiceChip
                key={preset.id}
                selected={!restDurationCustom && restDurationSec === preset.seconds}
                onSelect={() => {
                  setRestDurationSec(preset.seconds)
                  setRestDurationCustom(false)
                }}
              >
                {preset.label}
              </ChoiceChip>
            ))}
            <ChoiceChip selected={restDurationCustom} onSelect={() => setRestDurationCustom(true)}>
              CUSTOM
            </ChoiceChip>
          </div>
          {restDurationCustom ? (
            <Stepper
              label="custom rest duration"
              valueLabel={formatDuration(restDurationSec)}
              onDecrease={() =>
                setRestDurationSec((value) =>
                  clamp(value - REST_DURATION_LIMITS.step, REST_DURATION_LIMITS.min, REST_DURATION_LIMITS.max),
                )
              }
              onIncrease={() =>
                setRestDurationSec((value) =>
                  clamp(value + REST_DURATION_LIMITS.step, REST_DURATION_LIMITS.min, REST_DURATION_LIMITS.max),
                )
              }
              decreaseDisabled={restDurationSec <= REST_DURATION_LIMITS.min}
              increaseDisabled={restDurationSec >= REST_DURATION_LIMITS.max}
            />
          ) : null}
        </section>

        <section className="fighter-section" aria-label="Choose your fighter">
          <p className="fighter-label">CHOOSE YOUR FIGHTER</p>
          {selectedFighter ? (
            <article className="selected-fighter-card">
              <p className="selected-kicker">SELECTED FIGHTER</p>
              <h3 className="selected-name">{selectedFighter.name}</h3>
              <p className="selected-division">{selectedFighter.division}</p>
              <button
                type="button"
                className="change-fighter-btn"
                onClick={() => {
                  setSelectedFighter(null)
                  setQuery('')
                }}
              >
                CHANGE FIGHTER
              </button>
            </article>
          ) : (
            <>
              <form
                className="fighter-search"
                onSubmit={(event) => {
                  event.preventDefault()
                }}
              >
                <input
                  className="fighter-input"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search your fighter..."
                  aria-label="Search your fighter"
                  autoComplete="off"
                />
                <button type="submit" className="search-btn" aria-label="Search fighters">
                  <svg viewBox="0 0 24 24" className="search-icon" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              </form>
              {query.trim().length >= 2 && visibleFighters.length === 0 ? (
                <div className="search-empty">
                  <p className="search-empty-title">NO FIGHTER FOUND</p>
                  <p className="search-empty-copy">Try another name.</p>
                </div>
              ) : null}
              {visibleFighters.length > 0 ? (
                <div className="fighter-list" role="listbox" aria-label="Matching fighters">
                  {visibleFighters.map((fighter) => (
                    <article key={fighter.id} className="fighter-card is-result">
                      <FighterPortrait src={fighter.imageUrl} alt={fighter.name} className="result-paint" />
                      <div className="fighter-body">
                        <div className="fighter-meta">
                          <p className="fighter-name">{fighter.name}</p>
                          <p className="fighter-rank">{fighter.division}</p>
                        </div>
                        <button
                          type="button"
                          className="select-fighter-btn"
                          onClick={() => setSelectedFighter(withArtworkFallback(fighter))}
                        >
                          SELECT
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>

        <button
          type="button"
          className="start-btn"
          onClick={() => selectedFighter && onStart(selectedFighter)}
          disabled={!selectedFighter}
        >
          START WORKOUT
        </button>
        <footer className="site-footer">
          <a href="/privacy-policy/">Privacy Policy</a>
        </footer>
      </div>
    </main>
  )
}
