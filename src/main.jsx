import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PresentView from './components/PresentView.jsx'

const isPresentRoute = window.location.pathname.replace(/\/$/, '') === '/present'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPresentRoute ? <PresentView /> : <App />}
  </StrictMode>,
)
