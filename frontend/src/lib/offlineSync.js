import { getPending, markSynced, markFailed, incrementRetry } from './offlineQueue'

const MAX_RETRIES = 3
const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Obtiene headers de autenticación desde localStorage
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

/**
 * Procesa un item individual de la cola
 * @param {object} item
 * @returns {Promise<boolean>} true si se sincronizó ok
 */
async function processItem(item) {
  try {
    const authHeaders = getAuthHeaders()

    if (item.type === 'file') {
      // Subida de archivo: FormData con el blob
      const formData = new FormData()
      if (item.nombre) formData.append('archivo', new Blob([item.archivo_blob], { type: item.mime_type || 'application/octet-stream' }), item.nombre)
      if (item.expediente_id) formData.append('expediente_id', String(item.expediente_id))
      if (item.body) {
        for (const [key, val] of Object.entries(item.body)) {
          formData.append(key, val)
        }
      }

      const res = await fetch(`${API_BASE}${item.url}`, {
        method: item.method,
        headers: authHeaders,
        body: formData,
      })

      if (!res.ok && res.status !== 413) return false
      if (res.status === 413) {
        console.warn(`[Sync] Archivo demasiado grande (413): ${item.nombre}`)
        await markFailed(item.id)
        return true // No reintentar archivos demasiado grandes
      }
    } else {
      // Formulario: JSON
      const res = await fetch(`${API_BASE}${item.url}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(item.body),
      })

      if (!res.ok) return false
    }

    await markSynced(item.id)
    return true
  } catch (err) {
    console.warn(`[Sync] Error procesando item ${item.id}:`, err.message)
    return false
  }
}

/**
 * Procesa toda la cola FIFO
 * @returns {Promise<{synced: number, failed: number, errors: string[]}>}
 */
export async function processQueue() {
  const items = await getPending()
  if (items.length === 0) return { synced: 0, failed: 0, errors: [] }

  const errors = []
  let synced = 0
  let failed = 0

  for (const item of items) {
    const ok = await processItem(item)
    if (ok) {
      synced++
    } else {
      if (item.retryCount >= MAX_RETRIES) {
        await markFailed(item.id)
        failed++
        errors.push(
          `Item ${item.id} (${item.type}): máximos reintentos alcanzados`
        )
      } else {
        await incrementRetry(item.id)
        failed++
        errors.push(`Item ${item.id} (${item.type}): reintento ${(item.retryCount || 0) + 1}/${MAX_RETRIES}`)
      }
    }
  }

  // Disparar evento global para que la UI se refresque
  if (synced > 0 || failed > 0) {
    window.dispatchEvent(new CustomEvent('repogps:sync-complete', {
      detail: { synced, failed, errors }
    }))
  }

  return { synced, failed, errors }
}

// Variables para evitar doble ejecución
let processing = false
let online = navigator.onLine

/**
 * Inicializa los listeners de conectividad y procesa cola pendiente
 * @param {function} [onSyncResult] - Callback con resultado de sync
 */
export function initSync(onSyncResult) {
  const handleOnline = async () => {
    online = true
    if (processing) return
    processing = true
    const result = await processQueue()
    processing = false
    if (result.synced > 0 || result.failed > 0) {
      onSyncResult?.(result)
    }
  }

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && navigator.onLine && !processing) {
      processing = true
      const result = await processQueue()
      processing = false
      if (result.synced > 0 || result.failed > 0) {
        onSyncResult?.(result)
      }
    }
  }

  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Procesar cola pendiente al inicio si hay conexión
  if (navigator.onLine) {
    handleOnline()
  }

  // Cleanup
  return () => {
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}

export function isOnline() {
  return online
}
