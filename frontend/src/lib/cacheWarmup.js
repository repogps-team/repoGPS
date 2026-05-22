const API_URL = import.meta.env.VITE_API_URL || ''

const ENDPOINTS = {
  admin: [
    '/api/expedientes',
    '/api/areas',
    '/api/roles',
    '/api/usuarios',
    '/api/contratistas',
    '/api/categorias',
    '/api/subtipos',
    '/api/disciplinas',
    '/api/procesos?incluir_inactivos=true',
    '/api/etapas-proceso?incluir_inactivos=true',
    '/api/forms',
  ],
  nonAdmin: [
    '/api/expedientes',
    '/api/forms',
  ]
}

let warmedUp = false

/**
 * Precalienta el cache del Service Worker disparando fetch a todos los endpoints
 * críticos en background. El SW los intercepta y cachea via StaleWhileRevalidate.
 * Solo se ejecuta una vez por sesión.
 *
 * @param {boolean} isAdmin - Si el usuario es admin (carga más endpoints)
 */
export function warmupCache(isAdmin = false) {
  if (warmedUp) return
  if (!navigator.onLine) return

  const token = localStorage.getItem('token')
  if (!token) return

  warmedUp = true

  const endpoints = isAdmin ? ENDPOINTS.admin : ENDPOINTS.nonAdmin
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Fire & forget — el SW intercepta cada fetch y lo cachea
  endpoints.forEach((endpoint) => {
    fetch(`${API_URL}${endpoint}`, { headers }).catch(() => {
      // Fallo silencioso — no interfiere con la UX
    })
  })
}
