import { useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import logoUrl from './assets/brand/c24-logo.png'
import { ConfigCard, Chip, LEVEL_OPTIONS, PACE_OPTIONS, STYLE_OPTIONS, Stepper } from './SetupScreen'
import { renderCard } from './challenge/card.js'
import {
  addDaysToDay,
  androidIntentUrl,
  challengeDetails,
  challengeTitle,
  challengeUrl,
  completionMessage,
  createChallenge,
  deadlineLabel,
  deadlineStatus,
  decodeChallenge,
  encodeChallenge,
  localDay,
  shareMessage,
} from './challenge/challenge.js'
import { shareCard } from './challenge/share.js'

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.c24cardio.app'
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
import './ChallengeScreen.css'

function Frame({ title, onBack, children }) {
  return (
    <main className="progress challenge">
      <div className="screen-frame progress-frame">
        <header className="progress-top">
          <img className="brand-mark" src={logoUrl} alt="" />
          <div className="progress-heading">
            <p className="brand-word progress-word">C24 CARDIO</p>
            <h1 className="progress-title">{title}</h1>
          </div>
          <button type="button" className="back-btn" onClick={onBack}>
            BACK
          </button>
        </header>
        {children}
      </div>
    </main>
  )
}

// The rendered PNG card, shown exactly as it will be shared.
function CardImage({ kind, challenge, completedAt }) {
  const [card, setCard] = useState(null)
  useEffect(() => {
    let live = true
    renderCard(kind, { challenge, completedAt })
      .then((c) => live && setCard(c))
      .catch(() => live && setCard({ error: true }))
    return () => {
      live = false
    }
  }, [kind, challenge, completedAt])
  if (card?.error) return <p className="challenge-error">Could not draw the card.</p>
  return card ? (
    <img className="challenge-card-img" src={card.dataUrl} alt={kind === 'completed' ? 'Challenge completed card' : 'Challenge card'} />
  ) : (
    <div className="challenge-card-img is-loading" aria-label="Drawing the card" />
  )
}

function useShare() {
  const [status, setStatus] = useState('')
  const share = async (kind, challenge, text, completedAt) => {
    setStatus('')
    try {
      const card = await renderCard(kind, { challenge, completedAt })
      const result = await shareCard({ ...card, text, title: 'C24 Challenge' })
      if (result === 'downloaded') setStatus('Card saved and message copied. Paste it in WhatsApp or any app.')
    } catch {
      setStatus('Sharing didn’t open. Try again.')
    }
  }
  return { status, share }
}

const today = () => localDay(Date.now())

// ---- create -----------------------------------------------------------------

export function CreateChallengeScreen({ setup, training, onCreated, onBack }) {
  const [form, setForm] = useState(() => ({
    ...setup,
    style: training.style,
    level: training.level,
    paceSec: training.paceSec,
    deadlineChoice: 'today',
    date: addDaysToDay(today(), 7),
    from: '',
  }))
  const [errors, setErrors] = useState([])
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const step = (key, delta, limits) => set({ [key]: clamp(form[key] + delta, limits.min, limits.max) })
  const row = (title, options, key) => (
    <div className="training-row">
      <p className="training-label">{title}</p>
      <div className="chip-row is-three">
        {options.map((o) => (
          <Chip key={o.value} selected={form[key] === o.value} label={o.aria} onSelect={() => set({ [key]: o.value })}>
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  )

  const create = () => {
    const now = Date.now()
    const t = localDay(now)
    const deadline = form.deadlineChoice === 'today' ? t : form.deadlineChoice === 'tomorrow' ? addDaysToDay(t, 1) : form.date
    try {
      const challenge = createChallenge({ ...form, deadline }, { now })
      onCreated(encodeChallenge(challenge))
    } catch (err) {
      setErrors(err.errors ?? [err.message])
    }
  }

  return (
    <Frame title="CREATE CHALLENGE" onBack={onBack}>
      <section className="config-card training-card" aria-label="Workout type">
        <h2 className="config-title">WORKOUT</h2>
        {row('TYPE', STYLE_OPTIONS, 'style')}
        {row('DIFFICULTY', LEVEL_OPTIONS, 'level')}
        {row('COMBO EVERY', PACE_OPTIONS, 'paceSec')}
      </section>

      <ConfigCard
        title="ROUNDS"
        presets={ROUND_COUNT_PRESETS.map((count) => ({ key: count, value: count, label: count }))}
        value={form.rounds}
        custom={form.roundsCustom}
        onPreset={(value) => set({ rounds: value, roundsCustom: false })}
        onCustom={() => set({ roundsCustom: true })}
        stepper={
          <Stepper
            label="rounds"
            valueLabel={formatRoundCount(form.rounds)}
            onDecrease={() => step('rounds', -1, ROUND_COUNT_LIMITS)}
            onIncrease={() => step('rounds', 1, ROUND_COUNT_LIMITS)}
            decreaseDisabled={form.rounds <= ROUND_COUNT_LIMITS.min}
            increaseDisabled={form.rounds >= ROUND_COUNT_LIMITS.max}
          />
        }
      />
      <ConfigCard
        title="ROUND DURATION"
        presets={ROUND_DURATION_PRESETS.map((p) => ({ key: p.id, value: p.seconds, label: p.label }))}
        value={form.roundDurationSec}
        custom={form.roundDurationCustom}
        onPreset={(value) => set({ roundDurationSec: value, roundDurationCustom: false })}
        onCustom={() => set({ roundDurationCustom: true })}
        stepper={
          <Stepper
            label="round duration"
            valueLabel={formatDuration(form.roundDurationSec)}
            onDecrease={() => step('roundDurationSec', -ROUND_DURATION_LIMITS.step, ROUND_DURATION_LIMITS)}
            onIncrease={() => step('roundDurationSec', ROUND_DURATION_LIMITS.step, ROUND_DURATION_LIMITS)}
            decreaseDisabled={form.roundDurationSec <= ROUND_DURATION_LIMITS.min}
            increaseDisabled={form.roundDurationSec >= ROUND_DURATION_LIMITS.max}
          />
        }
      />
      <ConfigCard
        title="REST BETWEEN ROUNDS"
        presets={REST_DURATION_PRESETS.map((p) => ({ key: p.id, value: p.seconds, label: p.label }))}
        value={form.restDurationSec}
        custom={form.restDurationCustom}
        onPreset={(value) => set({ restDurationSec: value, restDurationCustom: false })}
        onCustom={() => set({ restDurationCustom: true })}
        stepper={
          <Stepper
            label="rest between rounds"
            valueLabel={formatDuration(form.restDurationSec)}
            onDecrease={() => step('restDurationSec', -REST_DURATION_LIMITS.step, REST_DURATION_LIMITS)}
            onIncrease={() => step('restDurationSec', REST_DURATION_LIMITS.step, REST_DURATION_LIMITS)}
            decreaseDisabled={form.restDurationSec <= REST_DURATION_LIMITS.min}
            increaseDisabled={form.restDurationSec >= REST_DURATION_LIMITS.max}
          />
        }
      />

      <section className="config-card" aria-label="Deadline">
        <h2 className="config-title">COMPLETE BY</h2>
        <div className="chip-row is-three">
          <Chip selected={form.deadlineChoice === 'today'} onSelect={() => set({ deadlineChoice: 'today' })}>
            TODAY
          </Chip>
          <Chip selected={form.deadlineChoice === 'tomorrow'} onSelect={() => set({ deadlineChoice: 'tomorrow' })}>
            TOMORROW
          </Chip>
          <Chip selected={form.deadlineChoice === 'date'} onSelect={() => set({ deadlineChoice: 'date' })}>
            PICK DATE
          </Chip>
        </div>
        {form.deadlineChoice === 'date' ? (
          <input
            className="challenge-input"
            type="date"
            aria-label="Deadline date"
            value={form.date}
            min={today()}
            max={addDaysToDay(today(), 365)}
            onChange={(e) => set({ date: e.target.value })}
          />
        ) : null}
      </section>

      <section className="config-card" aria-label="Your name">
        <h2 className="config-title">YOUR NAME (OPTIONAL)</h2>
        <input
          className="challenge-input"
          type="text"
          maxLength={24}
          placeholder="Shown as “NAME CHALLENGES YOU”"
          value={form.from}
          onChange={(e) => set({ from: e.target.value })}
        />
      </section>

      {errors.length ? (
        <ul className="challenge-error" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <button type="button" className="btn-primary" onClick={create}>
        CREATE CHALLENGE
      </button>
    </Frame>
  )
}

// ---- created card: share it ---------------------------------------------------

export function ChallengeCardScreen({ payload, onStart, onBack }) {
  const { challenge } = useMemo(() => decodeChallenge(payload), [payload])
  const { status, share } = useShare()
  return (
    <Frame title="YOUR CHALLENGE" onBack={onBack}>
      <CardImage kind="challenge" challenge={challenge} />
      <button
        type="button"
        className="btn-primary"
        onClick={() => share('challenge', challenge, shareMessage(challenge, challengeUrl(challenge), today()))}
      >
        SHARE CHALLENGE
      </button>
      {status ? <p className="challenge-note">{status}</p> : null}
      <button type="button" className="btn-outline" onClick={onStart}>
        DO IT YOURSELF NOW
      </button>
    </Frame>
  )
}

// ---- incoming link: accept it -----------------------------------------------

export function OpenChallengeScreen({ payload, entry, onAccept, onShareCompleted, onBack }) {
  const decoded = useMemo(() => decodeChallenge(payload), [payload])
  if (!decoded.ok) {
    return (
      <Frame title="CHALLENGE" onBack={onBack}>
        <p className="challenge-error" role="alert">
          {decoded.error}
        </p>
        <button type="button" className="btn-primary" onClick={onBack}>
          OK
        </button>
      </Frame>
    )
  }
  const c = decoded.challenge
  const status = deadlineStatus(c, today())
  const inBrowser = !Capacitor.isNativePlatform()
  const onAndroidWeb = inBrowser && /Android/i.test(navigator.userAgent)
  return (
    <Frame title="CHALLENGE" onBack={onBack}>
      <CardImage kind="challenge" challenge={c} />
      <p className="challenge-summary">
        {challengeTitle(c)} · {challengeDetails(c)}
        <br />
        <span className={status === 'expired' ? 'is-expired' : ''}>{deadlineLabel(c, today())}</span>
      </p>
      {entry?.completedAt ? (
        <>
          <p className="challenge-note">You completed this challenge on {new Date(entry.completedAt).toLocaleDateString()}.</p>
          <button type="button" className="btn-outline" onClick={() => onShareCompleted(entry.completedAt)}>
            SHARE COMPLETION CARD
          </button>
        </>
      ) : null}
      {!inBrowser ? (
        <button type="button" className="btn-primary" onClick={onAccept}>
          {status === 'expired' ? 'DO IT ANYWAY' : 'ACCEPT THE CHALLENGE'}
        </button>
      ) : onAndroidWeb ? (
        // In a browser the challenge only opens in the app (no web workout).
        // If the app is not installed, Android goes to its Play Store page.
        <a className="btn-primary challenge-link-btn" href={androidIntentUrl(payload, PLAY_STORE_URL)}>
          ACCEPT THE CHALLENGE
        </a>
      ) : (
        <p className="challenge-note">Open this link on your Android phone with the C24 Cardio app to accept the challenge.</p>
      )}
    </Frame>
  )
}

// ---- after the workout: completion card ---------------------------------------

export function CompletedChallengeScreen({ payload, completedAt, onBack }) {
  const { challenge } = useMemo(() => decodeChallenge(payload), [payload])
  const { status, share } = useShare()
  return (
    <Frame title="CHALLENGE DONE" onBack={onBack}>
      <CardImage kind="completed" challenge={challenge} completedAt={completedAt} />
      <button
        type="button"
        className="btn-primary"
        onClick={() => share('completed', challenge, completionMessage(challenge, localDay(completedAt), challengeUrl(challenge)), completedAt)}
      >
        SHARE COMPLETION CARD
      </button>
      {status ? <p className="challenge-note">{status}</p> : null}
    </Frame>
  )
}
