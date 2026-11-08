import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (font-display: swap). Inter is variable; unicode-range keeps non-Latin files unfetched.
import '@fontsource-variable/inter/index.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
