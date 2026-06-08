import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export const useEtapas = () => {
  const [etapas, setEtapas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { get, post, put, patch, del } = useApi()

  const cargarEtapas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Trae todas las etapas (activas e inactivas) para filtrar localmente
      const data = await get('/api/etapas-proceso?incluir_inactivos=true')
      if (Array.isArray(data)) {
        setEtapas(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [get])

  const crearEtapa = useCallback(async (etapa) => {
    const data = await post('/api/etapas-proceso', {
      proceso_id: Number(etapa.proceso_id),
      nombre: etapa.nombre,
      orden: Number(etapa.orden),
      es_final: etapa.es_final,
      tipo_tarea: etapa.tipo_tarea || null,
      rol_id: etapa.rol_id ? Number(etapa.rol_id) : null
    })
    return data
  }, [post])

  const actualizarEtapa = useCallback(async (id, etapa) => {
    const data = await put(`/api/etapas-proceso/${id}`, {
      proceso_id: Number(etapa.proceso_id),
      nombre: etapa.nombre,
      orden: Number(etapa.orden),
      es_final: etapa.es_final,
      tipo_tarea: etapa.tipo_tarea || null,
      rol_id: etapa.rol_id ? Number(etapa.rol_id) : null
    })
    return data
  }, [put])

  const cambiarEstado = useCallback(async (id, nuevoEstado) => {
    const data = await patch(`/api/etapas-proceso/${id}/estado`, { estado_activo: nuevoEstado })
    return data
  }, [patch])

  // Eliminar usa DELETE
  const eliminar = useCallback(async (id) => {
    const data = await del(`/api/etapas-proceso/${id}`)
    return data
  }, [del])

  return {
    etapas,
    loading,
    error,
    cargarEtapas,
    crearEtapa,
    actualizarEtapa,
    cambiarEstado,
    eliminar
  }
}
