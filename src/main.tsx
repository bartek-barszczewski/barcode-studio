import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/styles/tokens.css'
import './shared/styles/global.css'
import './shared/i18n/i18n'
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
