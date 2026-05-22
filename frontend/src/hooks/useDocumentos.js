import { useState, useCallback } from 'react'
import { useApi } from './useApi'
import { enqueue } from '../lib/offlineQueue'

export const useDocumentos = () => {
  const [versiones, setVersiones] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const { get, postFile, del } = useApi()

  /**
   * Upload a document to an expediente
   * @param {number} expedienteId - The expediente ID
   * @param {File} file - The file to upload
   * @param {string} descripcion - Optional description
   * @param {function} onProgress - Progress callback (0-100)
   * @returns {Promise<Object>} The uploaded document
   */
  const uploadDocumento = useCallback(async (expedienteId, file, descripcion = '', onProgress) => {
    // Offline: enqueue instead of uploading
    if (!navigator.onLine) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        await enqueue({
          type: 'file',
          expediente_id: expedienteId,
          url: '/api/documentos/upload',
          method: 'POST',
          nombre: file.name,
          archivo_blob: arrayBuffer,
          mime_type: file.type,
          body: descripcion ? { descripcion } : undefined
        })
        return { offline: true, nombre: file.name }
      } catch (err) {
        setError(err.message)
        throw err
      }
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('archivo', file)
      formData.append('expediente_id', expedienteId.toString())
      if (descripcion) {
        formData.append('descripcion', descripcion)
      }

      const progressCallback = (percent) => {
        setUploadProgress(percent)
        if (onProgress) onProgress(percent)
      }

      const result = await postFile('/api/documentos/upload', formData, progressCallback)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setUploading(false)
    }
  }, [postFile])

  /**
   * Get all versions of a document
   * @param {number} documentoId - The document ID
   * @returns {Promise<Array>} Array of versions
   */
  const getVersiones = useCallback(async (documentoId) => {
    setLoading(true)
    setError(null)

    try {
      const data = await get(`/api/documentos/${documentoId}/versiones`)
      setVersiones(data)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [get])

  /**
   * Download a specific version of a document
   * @param {number} documentoId - The document ID
   * @param {number} version - The version number (optional, defaults to current)
   * @returns {Promise<Blob>} The file blob
   */
  const downloadVersion = useCallback(async (documentoId, version = null) => {
    setLoading(true)
    setError(null)

    try {
      const endpoint = version
        ? `/api/documentos/${documentoId}/descargar/${version}`
        : `/api/documentos/${documentoId}/descargar`

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Error al descargar archivo')
      }

      const blob = await response.blob()
      return blob
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Download a version and trigger browser download
   * @param {number} documentoId - The document ID
   * @param {number} version - The version number
   * @param {string} filename - The filename for the download
   */
  const downloadAndSave = useCallback(async (documentoId, version, filename) => {
    try {
      const blob = await downloadVersion(documentoId, version)

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error al descargar:', err)
      throw err
    }
  }, [downloadVersion])

/**
    * Create a new version of an existing document
    * @param {number} documentoId - The document ID to create new version for
    * @param {File} file - The new file to upload as new version
    * @param {string} descripcion - Optional description
    * @param {function} onProgress - Progress callback (0-100)
    * @returns {Promise<Object>} The new version document
    */
  const crearVersion = useCallback(async (documentoId, file, descripcion = '', onProgress) => {
    // Offline: enqueue instead of uploading
    if (!navigator.onLine) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        await enqueue({
          type: 'file',
          expediente_id: documentoId,
          url: `/api/documentos/${documentoId}/versiones`,
          method: 'POST',
          nombre: file.name,
          archivo_blob: arrayBuffer,
          mime_type: file.type,
          body: descripcion ? { descripcion } : undefined
        })
        return { offline: true, nombre: file.name }
      } catch (err) {
        setError(err.message)
        throw err
      }
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('archivo', file)
      if (descripcion) {
        formData.append('descripcion', descripcion)
      }

      const progressCallback = (percent) => {
        setUploadProgress(percent)
        if (onProgress) onProgress(percent)
      }

      const result = await postFile(`/api/documentos/${documentoId}/versiones`, formData, progressCallback)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setUploading(false)
    }
  }, [postFile])

  /**
    * Delete a document and all its versions
    * @param {number} documentoId - The document ID
    * @returns {Promise<void>}
    */
  const deleteDocumento = useCallback(async (documentoId) => {
    setLoading(true)
    setError(null)

    try {
      await del(`/api/documentos/${documentoId}`)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [del])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    versiones,
    loading,
    uploading,
    uploadProgress,
    error,
    uploadDocumento,
    getVersiones,
    crearVersion,
    downloadVersion,
    downloadAndSave,
    deleteDocumento,
    clearError
  }
}