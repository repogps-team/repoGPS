import { useState, useEffect, useCallback } from 'react'
import { getCount } from '../../lib/offlineQueue'
import { initSync, isOnline, processQueue } from '../../lib/offlineSync'

const toastStyle = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  padding: '12px 20px',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 500,
  zIndex: 9999,
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  transition: 'all 0.3s ease',
  maxWidth: '360px',
}

const SyncIndicator = () => {
  const [pending, setPending] = useState(0)
  const [toast, setToast] = useState(null)

  const refreshCount = useCallback(async () => {
    const count = await getCount()
    setPending(count.pending)
  }, [])

  const handleSyncResult = useCallback((result) => {
    refreshCount()
    if (result.synced > 0 && result.failed === 0) {
      setToast({
        type: 'success',
        message: `✅ ${result.synced} elemento${result.synced !== 1 ? 's' : ''} sincronizado${result.synced !== 1 ? 's' : ''} correctamente`,
      })
    } else if (result.failed > 0) {
      setToast({
        type: 'warning',
        message: `⚠️ ${result.synced} sincronizado${result.synced !== 1 ? 's' : ''}, ${result.failed} error${result.failed !== 1 ? 'es' : ''}`,
      })
    }
    setTimeout(() => setToast(null), 5000)
  }, [refreshCount])

  useEffect(() => {
    // Cargar conteo inicial desde IndexedDB (asíncrono, no bloquea render)
    getCount().then((count) => setPending(count.pending)).catch(() => {})
    // Escuchar cambios de visibilidad para refrescar conteo
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount()
    }
    document.addEventListener('visibilitychange', onVisible)
    const cleanup = initSync(handleSyncResult)

    return () => {
      cleanup()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshCount, handleSyncResult])

  // Si no hay items pendientes y está online, no mostramos nada
  if (pending === 0 && isOnline()) return null

  return (
    <>
      {/* Badge de items pendientes */}
      {pending > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
          }}
        >
          <button
            onClick={async () => {
              const result = await processQueue()
              handleSyncResult(result)
            }}
            title="Sincronizar datos pendientes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '24px',
              border: 'none',
              background: '#f59e0b',
              color: 'white',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {pending} pendiente{pending !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Toast de resultado */}
      {toast && (
        <div
          style={{
            ...toastStyle,
            background: toast.type === 'success' ? '#ecfdf5' : '#fffbeb',
            color: toast.type === 'success' ? '#065f46' : '#92400e',
            border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fde68a'}`,
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}

export default SyncIndicator
