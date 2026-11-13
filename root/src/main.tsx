// Style nền tảng phải nạp TRƯỚC App để CSS của từng màn hình (landing, game…) ghi đè được
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'

const container = document.getElementById('app')
if (!container) throw new Error('Không tìm thấy #app')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
