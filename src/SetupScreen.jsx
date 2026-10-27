import logoUrl from './assets/brand/c24-logo.png'
import { plural } from './history.js'
import {
  REST_DURATION_LIMITS,
  REST_DURATION_PRESETS,
  ROUND_COUNT_LIMITS,
  ROUND_COUNT_PRESETS,
  ROUND_DURATION_LIMITS,
  ROUND_DURATION_PRESETS,
  clamp,
  formatDuration,
  formatRoundCount,
} from './workout'

function Chip({ selected, children, onSelect, label }) {
  return (
    <button
      type="button"
      className={`chip${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
    >
      {children}
    </button>
  )
}

function Stepper({ label, valueLabel, onDecrease, onIncrease, decreaseDisabled, increaseDisabled }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper-btn" onClick={onDecrease} disabled={decreaseDisabled} aria-label={`Decrease ${label}`}>
        −
      </button>
      <p className="stepper-value" aria-live="polite">
        {valueLabel}
      </p>
      <button type="button" className="stepper-btn" onClick={onIncrease} disabled={increaseDisabled} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  )
}

function ConfigCard({ title, presets, value, custom, onPreset, onCustom, stepper }) {
  return (
    <section className="config-card" aria-label={title}>
      <h2 className="config-title">{title}</h2>
      <div className="chip-row">
        {presets.map((preset) => (
          <Chip key={preset.key} selected={!custom && value === preset.value} onSelect={() => onPreset(preset.value)}>
            {preset.label}
          </Chip>
        ))}
        <Chip selected={custom} onSelect={onCustom}>
          CUSTOM
        </Chip>
      </div>
      {custom ? stepper : null}
    </section>
  )
}

function StatTile({ label, totals }) {
  return (
    <div className="stat-tile">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{plural(totals.rounds, 'ROUND')}</p>
      <p className="stat-sub">{plural(totals.sessions, 'SESSION')}</p>
    </div>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SetupScreen({ setup, onChange, stats, onStart, onReset, onOpenProgress }) {
  const { rounds, roundsCustom, roundDurationSec, roundDurationCustom, restDurationSec, restDurationCustom } = setup
  const set = (patch) => onChange({ ...setup, ...patch })
  const step = (key, delta, limits) => set({ [key]: clamp(setup[key] + delta, limits.min, limits.max) })

  return (
    <main className="setup">
      <div className="screen-frame setup-frame">
        <header className="setup-top">
          <div className="setup-brand">
            <img className="brand-mark" src={logoUrl} alt="" />
            <h1 className="brand-word setup-word">C24 CARDIO</h1>
          </div>
          <div className="setup-actions">
            <button type="button" className="text-btn" onClick={onOpenProgress}>
              PROGRESS
            </button>
            <button type="button" className="icon-btn" onClick={onReset} aria-label="Reset workout settings">
              <ResetIcon />
            </button>
          </div>
        </header>

        <ConfigCard
          title="ROUNDS"
          presets={ROUND_COUNT_PRESETS.map((count) => ({ key: count, value: count, label: count }))}
          value={rounds}
          custom={roundsCustom}
          onPreset={(value) => set({ rounds: value, roundsCustom: false })}
          onCustom={() => set({ roundsCustom: true })}
          stepper={
            <Stepper
              label="rounds"
              valueLabel={formatRoundCount(rounds)}
              onDecrease={() => step('rounds', -1, ROUND_COUNT_LIMITS)}
              onIncrease={() => step('rounds', 1, ROUND_COUNT_LIMITS)}
              decreaseDisabled={rounds <= ROUND_COUNT_LIMITS.min}
              increaseDisabled={rounds >= ROUND_COUNT_LIMITS.max}
            />
          }
        />

        <ConfigCard
          title="ROUND DURATION"
          presets={ROUND_DURATION_PRESETS.map((p) => ({ key: p.id, value: p.seconds, label: p.label }))}
          value={roundDurationSec}
          custom={roundDurationCustom}
          onPreset={(value) => set({ roundDurationSec: value, roundDurationCustom: false })}
          onCustom={() => set({ roundDurationCustom: true })}
          stepper={
            <Stepper
              label="round duration"
              valueLabel={formatDuration(roundDurationSec)}
              onDecrease={() => step('roundDurationSec', -ROUND_DURATION_LIMITS.step, ROUND_DURATION_LIMITS)}
              onIncrease={() => step('roundDurationSec', ROUND_DURATION_LIMITS.step, ROUND_DURATION_LIMITS)}
              decreaseDisabled={roundDurationSec <= ROUND_DURATION_LIMITS.min}
              increaseDisabled={roundDurationSec >= ROUND_DURATION_LIMITS.max}
            />
          }
        />

        <ConfigCard
          title="REST BETWEEN ROUNDS"
          presets={REST_DURATION_PRESETS.map((p) => ({ key: p.id, value: p.seconds, label: p.label }))}
          value={restDurationSec}
          custom={restDurationCustom}
          onPreset={(value) => set({ restDurationSec: value, restDurationCustom: false })}
          onCustom={() => set({ restDurationCustom: true })}
          stepper={
            <Stepper
              label="rest between rounds"
              valueLabel={formatDuration(restDurationSec)}
              onDecrease={() => step('restDurationSec', -REST_DURATION_LIMITS.step, REST_DURATION_LIMITS)}
              onIncrease={() => step('restDurationSec', REST_DURATION_LIMITS.step, REST_DURATION_LIMITS)}
              decreaseDisabled={restDurationSec <= REST_DURATION_LIMITS.min}
              increaseDisabled={restDurationSec >= REST_DURATION_LIMITS.max}
            />
          }
        />

        <section className="training" aria-label="Your training">
          <h2 className="section-kicker">YOUR TRAINING</h2>
          <div className="stat-grid">
            <StatTile label="TODAY" totals={stats.totals.today} />
            <StatTile label="THIS WEEK" totals={stats.totals.week} />
            <StatTile label="THIS MONTH" totals={stats.totals.month} />
            <StatTile label="THIS YEAR" totals={stats.totals.year} />
          </div>
          {stats.bestDay > 0 ? <p className="best-day">BEST DAY · {plural(stats.bestDay, 'ROUND')}</p> : null}

          <div className="streak-card">
            <p className="streak-kicker">CURRENT STREAK</p>
            <p className="streak-value">
              <strong>{stats.streak}</strong> <span>{stats.streak === 1 ? 'DAY' : 'DAYS'}</span>
            </p>
            <p className="streak-message">{stats.streakMessage}</p>
            <ol className="week-dots" aria-label="This week">
              {stats.week.map((day) => (
                <li
                  key={day.key}
                  className={`${day.isToday ? 'is-today' : ''}${day.rounds > 0 ? ' is-done' : ''}`}
                  aria-label={`${day.label}: ${day.rounds > 0 ? 'trained' : 'no workout'}`}
                >
                  <span className="dot-label">{day.initial}</span>
                  <span className="dot" />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <button type="button" className="btn-primary start-btn" onClick={onStart}>
          START WORKOUT <span aria-hidden="true">›</span>
        </button>
        <footer className="setup-footer">
          <a href="/privacy-policy/">Privacy Policy</a>
        </footer>
      </div>
    </main>
  )
}
