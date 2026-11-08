import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts, Latin subset only (font-display: swap).
import '@fontsource/anton/latin-400.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import './index.css'
import { applyTokens } from './motion-config'
import App from './App.tsx'

// Colors, type, timings and eases come from one config; write them to CSS before the first paint.
applyTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
