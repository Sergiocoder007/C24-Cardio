import { useState } from 'react'
import { DEFAULT_SETUP } from './workout'
import { SetupScreen } from './SetupScreen'
import { WorkoutScreen } from './WorkoutScreen'
import { unlockWorkoutAudio } from './audio'
import { withArtworkFallback } from './fighters'
import './App.css'

function App() {
  const [screen, setScreen] = useState('setup')
  const [session, setSession] = useState(null)
  const [rounds, setRounds] = useState(DEFAULT_SETUP.rounds)
  const [roundsCustom, setRoundsCustom] = useState(DEFAULT_SETUP.roundsCustom)
  const [roundDurationSec, setRoundDurationSec] = useState(DEFAULT_SETUP.roundDurationSec)
  const [roundDurationCustom, setRoundDurationCustom] = useState(DEFAULT_SETUP.roundDurationCustom)
  const [restDurationSec, setRestDurationSec] = useState(DEFAULT_SETUP.restDurationSec)
  const [restDurationCustom, setRestDurationCustom] = useState(DEFAULT_SETUP.restDurationCustom)
  const [selectedFighter, setSelectedFighter] = useState(null)
  const [soundOn, setSoundOn] = useState(true)

  function resetSetup() {
    setRounds(DEFAULT_SETUP.rounds)
    setRoundsCustom(DEFAULT_SETUP.roundsCustom)
    setRoundDurationSec(DEFAULT_SETUP.roundDurationSec)
    setRoundDurationCustom(DEFAULT_SETUP.roundDurationCustom)
    setRestDurationSec(DEFAULT_SETUP.restDurationSec)
    setRestDurationCustom(DEFAULT_SETUP.restDurationCustom)
    setSelectedFighter(null)
  }

  function startWorkout(fighter) {
    void unlockWorkoutAudio()
    setSession({
      rounds,
      roundDurationSec,
      restDurationSec,
      fighter: withArtworkFallback(fighter),
    })
    setScreen('workout')
  }

  if (screen === 'workout' && session) {
    return (
      <WorkoutScreen
        session={session}
        soundOn={soundOn}
        onSoundChange={setSoundOn}
        onExit={() => setScreen('setup')}
      />
    )
  }

  return (
    <SetupScreen
      rounds={rounds}
      setRounds={setRounds}
      roundsCustom={roundsCustom}
      setRoundsCustom={setRoundsCustom}
      roundDurationSec={roundDurationSec}
      setRoundDurationSec={setRoundDurationSec}
      roundDurationCustom={roundDurationCustom}
      setRoundDurationCustom={setRoundDurationCustom}
      restDurationSec={restDurationSec}
      setRestDurationSec={setRestDurationSec}
      restDurationCustom={restDurationCustom}
      setRestDurationCustom={setRestDurationCustom}
      selectedFighter={selectedFighter}
      setSelectedFighter={setSelectedFighter}
      onReset={resetSetup}
      onStart={startWorkout}
    />
  )
}

export default App
