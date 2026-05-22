const API_URL = import.meta.env.VITE_API_URL || ''

const LIST_ENDPOINTS = {
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
  ],
}

let warmedUp = false

/**
 * Precalienta el cache del Service Worker en 2 fases:
 *
 * Fase 1: Dispara fetch a todos los endpoints de listado.
 *         El SW los intercepta y cachea via StaleWhileRevalidate.
 *
 * Fase 2: Lee los IDs de las respuestas de fase 1 y dispara fetch
 *         a los endpoints de detalle (historial, documentos, forms,
 *         respuestas). Así los detalles quedan cacheados sin que el
 *         usuario tenga que clickear cada item.
 *
 * Solo se ejecuta una vez por sesión. Todo corre en background sin
 * bloquear la UI.
 *
 * @param {boolean} isAdmin - Si el usuario es admin (carga más endpoints)
 */
export function warmupCache(isAdmin = false) {
  if (warmedUp) return
  if (!navigator.onLine) return

  const token = localStorage.getItem('token')
  if (!token) return

  warmedUp = true

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const listEps = isAdmin ? LIST_ENDPOINTS.admin : LIST_ENDPOINTS.nonAdmin

  // === Fase 1: Cachear listas ===
  listEps.forEach((endpoint) => {
    fetch(`${API_URL}${endpoint}`, { headers }).catch(() => {})
  })

  // === Fase 2: Cachear detalles (async, no bloquea) ===
  warmupDetails(listEps, headers)
}

/**
 * Fase 2: Obtiene los IDs desde las listas y precarga los endpoints de detalle.
 */
async function warmupDetails(listEps, headers) {
  try {
    // Fetch lists again — SW sirve desde cache (StaleWhileRevalidate)
    const responses = await Promise.allSettled(
      listEps.map((ep) => fetch(`${API_URL}${ep}`, { headers }))
    )

    // Mapear respuestas a sus endpoints
    const dataMap = {}
    for (let i = 0; i < listEps.length; i++) {
      if (responses[i].status === 'fulfilled') {
        try {
          dataMap[listEps[i]] = await responses[i].value.json()
        } catch {
          // JSON inválido, ignorar
        }
      }
    }

    const details = []

    // --- Expedientes: historial, documentos, forms asociados ---
    const expedientes = dataMap['/api/expedientes']
    if (Array.isArray(expedientes)) {
      expedientes.slice(0, 5).forEach((exp) => {
        details.push(`/api/historial/expediente/${exp.id}`)
        details.push(`/api/documentos/expediente/${exp.id}`)
        details.push(`/api/forms/expediente/${exp.id}`)
      })
    }

    // --- Forms: definición del form + respuestas ---
    const forms = dataMap['/api/forms']
    if (Array.isArray(forms)) {
      forms.slice(0, 5).forEach((form) => {
        details.push(`/api/forms/${form.id}`)
        details.push(`/api/forms/${form.id}/respuestas`)
      })
    }

    if (details.length === 0) return

    // Disparar todos los detalles en paralelo (fire & forget)
    await Promise.allSettled(
      details.map((ep) =>
        fetch(`${API_URL}${ep}`, { headers })
      )
    )
  } catch {
    // Fallo silencioso — no interfiere con la UX
  }
}
