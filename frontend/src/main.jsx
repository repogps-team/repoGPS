import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import '@formio/js/dist/formio.full.min.css'
import '@formio/js/dist/formio.builder.min.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext.jsx'
import App from './App.jsx'

// Initialize theme from localStorage before React renders
const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
