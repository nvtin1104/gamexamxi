import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

const container = document.getElementById('app')
if (!container) throw new Error('Không tìm thấy #app')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
