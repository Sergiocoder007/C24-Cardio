import logoUrl from './assets/brand/c24-logo.png'
import { formatTrainingTime, plural } from './history.js'

function PeriodCard({ title, totals }) {
  return (
    <section className="period-card" aria-label={title}>
      <h2 className="card-kicker">{title}</h2>
      <div className="period-row">
        <div>
          <strong>{totals.sessions}</strong>
          <span>SESSIONS</span>
        </div>
        <div>
          <strong>{totals.rounds}</strong>
          <span>ROUNDS</span>
        </div>
        <div>
          <strong>{formatTrainingTime(totals.workSec)}</strong>
          <span>TRAINING TIME</span>
        </div>
      </div>
    </section>
  )
}

export function ProgressScreen({ stats, onBack }) {
  const max = Math.max(0, ...stats.week.map((day) => day.rounds))

  return (
    <main className="progress">
      <div className="screen-frame progress-frame">
        <header className="progress-top">
          <img className="brand-mark" src={logoUrl} alt="" />
          <div className="progress-heading">
            <p className="brand-word progress-word">C24 CARDIO</p>
            <h1 className="progress-title">YOUR PROGRESS</h1>
          </div>
          <button type="button" className="back-btn" onClick={onBack}>
            BACK
          </button>
        </header>

        <PeriodCard title="TODAY" totals={stats.totals.today} />
        <PeriodCard title="THIS WEEK" totals={stats.totals.week} />
        <PeriodCard title="THIS MONTH" totals={stats.totals.month} />
        <PeriodCard title="ALL TIME" totals={stats.totals.all} />

        <section className="period-card" aria-label="Rounds this week">
          <h2 className="card-kicker">THIS WEEK</h2>
          <ul className="week-bars">
            {stats.week.map((day) => (
              <li key={day.key} className={day.isToday ? 'is-today' : ''}>
                <span className="bar-day">{day.label}</span>
                {day.rounds > 0 ? (
                  <span className="bar-track">
                    <span className="bar" style={{ width: `${Math.max(6, (day.rounds / max) * 100)}%` }} />
                    <span className="bar-value">{day.rounds}</span>
                  </span>
                ) : (
                  <span className="bar-empty" aria-label="no rounds" />
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="period-card" aria-label="Records">
          <h2 className="card-kicker">RECORDS</h2>
          <dl className="records">
            <div>
              <dt>BEST SESSION</dt>
              <dd>{stats.bestSession ? plural(stats.bestSession, 'ROUND') : '—'}</dd>
            </div>
            <div>
              <dt>LONGEST SESSION</dt>
              <dd>{stats.longestSessionSec ? formatTrainingTime(stats.longestSessionSec) : '—'}</dd>
            </div>
            <div>
              <dt>BEST DAY</dt>
              <dd>{stats.bestDay ? plural(stats.bestDay, 'ROUND') : '—'}</dd>
            </div>
            <div>
              <dt>CURRENT STREAK</dt>
              <dd>{plural(stats.streak, 'DAY')}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  )
}
