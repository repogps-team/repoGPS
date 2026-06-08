import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export const useEtapas = () => {
  const [etapas, setEtapas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { get } = useApi()

  const cargarEtapas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get('/api/etapas-proceso')
      if (Array.isArray(data)) {
        setEtapas(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [get])

  return {
    etapas,
    loading,
    error,
    cargarEtapas
  }
}
