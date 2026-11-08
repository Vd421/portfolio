import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Fonts load from Google Fonts at runtime (the bundler would try to inline the URL).
const fonts = document.createElement('link')
fonts.rel = 'stylesheet'
fonts.href = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;900&family=Barlow:wght@400;500;600;700&family=Martian+Mono:wght@400;500;700&display=swap'
document.head.appendChild(fonts)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
