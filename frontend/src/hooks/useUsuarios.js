import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [areas, setAreas] = useState([])
  const [usuariosSinArea, setUsuariosSinArea] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { get, post, put, patch } = useApi()

  const cargarUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get('/api/usuarios')
      if (Array.isArray(data)) {
        setUsuarios(data)
        // Filtrar usuarios sin área para el panel de asignación
        setUsuariosSinArea(data.filter(u => !u.area_id))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [get])

  const cargarRoles = useCallback(async () => {
    try {
      const data = await get('/api/roles')
      if (Array.isArray(data)) setRoles(data)
    } catch (err) {
      console.error('Error al cargar roles:', err)
    }
  }, [get])

  const cargarAreas = useCallback(async () => {
    try {
      const data = await get('/api/areas')
      if (Array.isArray(data)) setAreas(data)
    } catch (err) {
      console.error('Error al cargar áreas:', err)
    }
  }, [get])

  const crearUsuario = useCallback(async (usuario) => {
    const data = await post('/api/usuarios', {
      ...usuario,
      rol_id: Number(usuario.rol_id),
      area_id: Number(usuario.area_id)
    })
    return data
  }, [post])

  const actualizarUsuario = useCallback(async (id, usuario) => {
    const data = await put(`/api/usuarios/${id}`, {
      ...usuario,
      rol_id: Number(usuario.rol_id),
      area_id: Number(usuario.area_id)
    })
    return data
  }, [put])

  const cambiarEstado = useCallback(async (id, nuevoEstado) => {
    const data = await patch(`/api/usuarios/${id}/estado`, { estado_activo: nuevoEstado })
    return data
  }, [patch])

  // HU-20: Asignar usuario a un área (reemplaza cualquier área anterior)
  const asignarArea = useCallback(async (usuarioId, areaId) => {
    const data = await patch(`/api/usuarios/${usuarioId}/area`, { area_id: areaId })
    return data
  }, [patch])

  return {
    usuarios,
    roles,
    areas,
    usuariosSinArea,
    loading,
    error,
    cargarUsuarios,
    cargarRoles,
    cargarAreas,
    crearUsuario,
    actualizarUsuario,
    cambiarEstado,
    asignarArea
  }
}
