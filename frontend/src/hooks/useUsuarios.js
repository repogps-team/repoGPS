import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { get } = useApi()

  const cargarUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get('/api/usuarios')
      if (Array.isArray(data)) {
        setUsuarios(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [get])

  return {
    usuarios,
    loading,
    error,
    cargarUsuarios
  }
}
