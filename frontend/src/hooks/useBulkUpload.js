import { useState, useCallback } from 'react'
import { useApi } from './useApi'

/**
 * Hook dedicado para Carga Masiva de Documentos (Staging).
 * Completamente aislado del hook useDocumentos existente.
 */
export const useBulkUpload = () => {
  const [documentos, setDocumentos] = useState([])
  const [stats, setStats] = useState({ pendientes: 0, asignados: 0, total_bytes_pendientes: 0 })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const { get, post, del, postFile } = useApi()

  /**
   * Subir un archivo individual al staging
   */
  const uploadFile = useCallback(async (file, onProgress) => {
    const formData = new FormData()
    formData.append('archivo', file)
    if (file.lastModified) {
      formData.append('fecha_origen', new Date(file.lastModified).toISOString())
    }

    const result = await postFile('/api/staging/upload', formData, onProgress)
    return result
  }, [postFile])

  /**
   * Subir múltiples archivos en ráfagas (batching)
   * Procesa de a BATCH_SIZE archivos concurrentemente
   */
  const uploadBatch = useCallback(async (files, { batchSize = 10, onFileComplete, onBatchProgress } = {}) => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    const total = files.length
    let completed = 0
    let errors = []
    const results = []

    try {
      // Procesar en ráfagas
      for (let i = 0; i < total; i += batchSize) {
        const batch = files.slice(i, i + batchSize)
        const batchResults = await Promise.allSettled(
          batch.map(async (file) => {
            const formData = new FormData()
            formData.append('archivo', file)
            if (file.lastModified) {
              formData.append('fecha_origen', new Date(file.lastModified).toISOString())
            }
            const result = await postFile('/api/staging/upload', formData)
            completed++
            setUploadProgress(Math.round((completed / total) * 100))
            if (onFileComplete) onFileComplete(file.name, result)
            return result
          })
        )

        batchResults.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            results.push(r.value)
          } else {
            errors.push({ archivo: batch[idx].name, error: r.reason?.message || 'Error desconocido' })
          }
        })

        if (onBatchProgress) onBatchProgress(completed, total)
      }

      return { results, errors, total, completed }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setUploading(false)
    }
  }, [postFile])

  /**
   * Listar documentos del staging del usuario
   */
  const fetchDocumentos = useCallback(async ({ page = 1, limit = 100, search = '', sort = 'nombre_archivo', order = 'asc' } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page, limit, search, sort, order })
      const data = await get(`/api/staging/documentos?${params}`)
      setDocumentos(data.documentos || [])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [get])

  /**
   * Obtener estadísticas del staging
   */
  const fetchStats = useCallback(async () => {
    try {
      const data = await get('/api/staging/stats')
      setStats(data)
      return data
    } catch (err) {
      console.error('[useBulkUpload] Stats error:', err)
    }
  }, [get])

  /**
   * Eliminar un documento del staging
   */
  const deleteDocumento = useCallback(async (id) => {
    setError(null)
    try {
      await del(`/api/staging/documentos/${id}`)
      setDocumentos(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [del])

  /**
   * Eliminar varios documentos del staging
   */
  const deleteMultiple = useCallback(async (ids) => {
    setError(null)
    try {
      await post('/api/staging/documentos/delete-batch', { ids })
      setDocumentos(prev => prev.filter(d => !ids.includes(d.id)))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [post])

  /**
   * Asignar documentos del staging a un expediente
   * Este es el ÚNICO punto de conexión con el sistema existente
   */
  const asignarMasivo = useCallback(async (expedienteId, documentosIds) => {
    setError(null)
    try {
      const result = await post('/api/staging/asignar-masivo', {
        expediente_id: expedienteId,
        documentos_ids: documentosIds,
      })
      // Remover asignados del estado local
      setDocumentos(prev => prev.filter(d => !documentosIds.includes(d.id)))
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [post])

  const clearError = useCallback(() => setError(null), [])

  return {
    documentos,
    stats,
    loading,
    uploading,
    uploadProgress,
    error,
    uploadFile,
    uploadBatch,
    fetchDocumentos,
    fetchStats,
    deleteDocumento,
    deleteMultiple,
    asignarMasivo,
    clearError,
  }
}
