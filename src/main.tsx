import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Hoja global con Tailwind + Design System
import './styles.css'

// 👉 tema claro por defecto (puedes cambiarlo en Settings)
document.documentElement.classList.add('light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
