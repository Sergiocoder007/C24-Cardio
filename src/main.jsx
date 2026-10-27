import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/oswald'
import './index.css'
import App from './App.jsx'
import { Intro } from './Intro.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Intro />
  </StrictMode>,
)
