import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export const useExpedientes = () => {
  const [expedientes, setExpedientes] = useState([])
  const [expedienteDetalle, setExpedienteDetalle] = useState(null)
  const [historial, setHistorial] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { get, post, patch } = useApi()

  const cargarExpedientes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get('/api/expedientes')
      if (Array.isArray(data)) {
        setExpedientes(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [get])

  const crearExpediente = useCallback(async (expediente) => {
    const data = await post('/api/expedientes', {
      proceso_id: Number(expediente.proceso_id),
      disciplina_id: Number(expediente.disciplina_id),
      subtipo_id: expediente.subtipo_id ? Number(expediente.subtipo_id) : null,
      titulo: expediente.titulo,
      descripcion: expediente.descripcion,
      fecha_termino: expediente.fecha_termino || null,
      asignaciones: expediente.asignaciones || []
    })
    return data
  }, [post])

  const abrirDetalle = useCallback(async (exp) => {
    setExpedienteDetalle(exp)
    try {
      const [histData, docData] = await Promise.all([
        get(`/api/historial/expediente/${exp.id}`),
        get(`/api/documentos/expediente/${exp.id}`)
      ])
      setHistorial(Array.isArray(histData) ? histData : [])
      setDocumentos(Array.isArray(docData) ? docData : [])
    } catch (err) {
      console.error('Error al cargar detalle:', err)
    }
  }, [get])

  const cerrarDetalle = useCallback(() => {
    setExpedienteDetalle(null)
    setHistorial([])
    setDocumentos([])
  }, [])

  const avanzarExpediente = useCallback(async (id, observacion) => {
    const data = await post(`/api/expedientes/${id}/avanzar`, { observacion })
    if (data?.expediente) {
      setExpedientes(prev => prev.map(e => (e.id === data.expediente.id ? data.expediente : e)))
    } else if (data) {
      await cargarExpedientes()
    }
    return data
  }, [post, cargarExpedientes])

  const devolverExpediente = useCallback(async (id, observacion) => {
    const data = await post(`/api/expedientes/${id}/devolver`, { observacion })
    if (data?.expediente) {
      setExpedientes(prev => prev.map(e => (e.id === data.expediente.id ? data.expediente : e)))
    } else if (data) {
      await cargarExpedientes()
    }
    return data
  }, [post, cargarExpedientes])

  const rechazarExpediente = useCallback(async (id, observacion) => {
    const data = await post(`/api/expedientes/${id}/rechazar`, { observacion })
    if (data?.expediente) {
      setExpedientes(prev => prev.map(e => (e.id === data.expediente.id ? data.expediente : e)))
    } else if (data) {
      await cargarExpedientes()
    }
    return data
  }, [post, cargarExpedientes])

  const actualizarFechaTermino = useCallback(async (id, fecha_termino) => {
    const data = await patch(`/api/expedientes/${id}/fecha-termino`, { fecha_termino })
    if (data) {
      setExpedientes(prev => prev.map(e => (e.id === data.id ? { ...e, fecha_termino: data.fecha_termino } : e)))
    }
    return data
  }, [patch])

  const refreshDocumentos = useCallback(async (expedienteId) => {
    if (!expedienteId) return
    try {
      const docData = await get(`/api/documentos/expediente/${expedienteId}`)
      if (Array.isArray(docData)) {
        setDocumentos(docData)
      }
    } catch {
      // Silently fail — SW cache will serve if offline
    }
  }, [get])

  return {
    expedientes,
    expedienteDetalle,
    historial,
    documentos,
    loading,
    error,
    cargarExpedientes,
    crearExpediente,
    abrirDetalle,
    cerrarDetalle,
    avanzarExpediente,
    devolverExpediente,
    rechazarExpediente,
    actualizarFechaTermino,
    refreshDocumentos
  }
}
