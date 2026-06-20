import { useState, useCallback } from 'react'
import { useApi } from './useApi'
import { useAuth } from '../context/useAuth'

export const useTareas = () => {
  const { get, patch } = useApi()
  const { user } = useAuth()
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Cargar tareas del usuario por area y rol
  const cargarTareas = useCallback(async (usuarioId, areaId, rolId) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ usuario_id: usuarioId })
      if (areaId) params.append('area_id', areaId)
      if (rolId) params.append('rol_id', rolId)
      
      const data = await get(`/api/tareas/mis-tareas?${params}`)
      setTareas(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setTareas([])
    } finally {
      setLoading(false)
    }
  }, [get])

  // Marcar tarea como vista
  const marcarVisto = useCallback(async (tareaId) => {
    try {
      const data = await patch(`/api/tareas/${tareaId}/visto`, {
        usuario_id: user?.id,
        rol_id: user?.rol_id
      })
      setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, estado: 'visto' } : t))
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [patch, user?.id, user?.rol_id])

  // Completar, rechazar o subsanar tarea
  const actualizarTarea = useCallback(async (tareaId, estado, observacion = null) => {
    try {
      const data = await patch(`/api/tareas/${tareaId}`, {
        estado,
        observacion,
        usuario_id: user?.id,
        rol_id: user?.rol_id
      })
      // Remover tarea completada/rechazada de la lista
      // subsanacion permanece visible para que el usuario la subsane
      if (estado !== 'subsanacion') {
        setTareas(prev => prev.filter(t => t.id !== tareaId))
      } else {
        // Marcar como subsanacion en la lista local
        setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, estado: 'subsanacion', observacion } : t))
      }
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [patch, user?.id, user?.rol_id])

  return {
    tareas,
    loading,
    error,
    cargarTareas,
    marcarVisto,
    actualizarTarea
  }
}
