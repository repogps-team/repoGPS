import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../hooks/useApi'

const FormAssignment = () => {
  const { get, post } = useApi()

  const [contratistas, setContratistas] = useState([])
  const [areas, setAreas] = useState([])
  const [procesos, setProcesos] = useState([])
  const [expedientes, setExpedientes] = useState([])
  const [formularios, setFormularios] = useState([])

  const [selectedContratista, setSelectedContratista] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedProceso, setSelectedProceso] = useState('')
  const [selectedExpediente, setSelectedExpediente] = useState('')
  const [selectedFormulario, setSelectedFormulario] = useState('')

  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cargarInicial = async () => {
      try {
        const [contratistasData, formulariosData] = await Promise.all([
          get('/api/contratistas'),
          get('/api/forms')
        ])
        if (Array.isArray(contratistasData)) {
          setContratistas(contratistasData.filter(c => c.estado_activo))
        }
        if (Array.isArray(formulariosData)) {
          setFormularios(formulariosData.filter(f => f.estado_activo))
        }
      } catch (err) {
        setError(err.message)
      }
    }
    cargarInicial()
  }, [get])

  const cargarAreasPorContratista = useCallback(async (contratistaId) => {
    if (!contratistaId) {
      setAreas([])
      return
    }
    try {
      const data = await get(`/api/areas/contratista/${contratistaId}`)
      if (Array.isArray(data)) setAreas(data)
    } catch (err) {
      console.error('Error al cargar áreas:', err)
    }
  }, [get])

  const cargarProcesosPorArea = useCallback(async (areaId) => {
    if (!areaId) {
      setProcesos([])
      return
    }
    try {
      const data = await get(`/api/procesos?incluir_inactivos=true`)
      if (Array.isArray(data)) {
        setProcesos(data.filter(p => p.area_id === Number(areaId)))
      }
    } catch (err) {
      console.error('Error al cargar procesos:', err)
    }
  }, [get])

  const cargarExpedientesPorProceso = useCallback(async (procesoId) => {
    if (!procesoId) {
      setExpedientes([])
      return
    }
    try {
      const data = await get('/api/expedientes')
      if (Array.isArray(data)) {
        setExpedientes(data.filter(e => e.proceso_id === Number(procesoId) && e.estado_activo))
      }
    } catch (err) {
      console.error('Error al cargar expedientes:', err)
    }
  }, [get])

  const handleContratistaChange = async (e) => {
    const value = e.target.value
    setSelectedContratista(value)
    setSelectedArea('')
    setSelectedProceso('')
    setSelectedExpediente('')
    setAreas([])
    setProcesos([])
    setExpedientes([])
    if (value) {
      await cargarAreasPorContratista(value)
    }
  }

  const handleAreaChange = async (e) => {
    const value = e.target.value
    setSelectedArea(value)
    setSelectedProceso('')
    setSelectedExpediente('')
    setProcesos([])
    setExpedientes([])
    if (value) {
      await cargarProcesosPorArea(value)
    }
  }

  const handleProcesoChange = async (e) => {
    const value = e.target.value
    setSelectedProceso(value)
    setSelectedExpediente('')
    setExpedientes([])
    if (value) {
      await cargarExpedientesPorProceso(value)
    }
  }

  const handleAsignar = async (e) => {
    e.preventDefault()
    setMensaje(null)
    setError(null)

    if (!selectedExpediente || !selectedFormulario) {
      setError('Debe seleccionar un expediente y un formulario')
      return
    }

    setLoading(true)
    try {
      await post(`/api/forms/${selectedFormulario}/asignar`, {
        expediente_id: selectedExpediente
      })
      setMensaje('Formulario asignado correctamente')
      setSelectedContratista('')
      setSelectedArea('')
      setSelectedProceso('')
      setSelectedExpediente('')
      setSelectedFormulario('')
      setAreas([])
      setProcesos([])
      setExpedientes([])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-top">
        <h3>Asignar Formulario a Expediente</h3>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleAsignar} className="form-grid">
        <div className="field">
          <label>1. Contratista</label>
          <select value={selectedContratista} onChange={handleContratistaChange} required>
            <option value="">Seleccione...</option>
            {contratistas.map(c => (
              <option key={c.id} value={c.id}>{c.razon_social}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>2. Área</label>
          <select
            value={selectedArea}
            onChange={handleAreaChange}
            required
            disabled={!selectedContratista}
          >
            <option value="">Seleccione...</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>3. Proceso</label>
          <select
            value={selectedProceso}
            onChange={handleProcesoChange}
            required
            disabled={!selectedArea}
          >
            <option value="">Seleccione...</option>
            {procesos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>4. Expediente</label>
          <select
            value={selectedExpediente}
            onChange={e => setSelectedExpediente(e.target.value)}
            required
            disabled={!selectedProceso}
          >
            <option value="">Seleccione...</option>
            {expedientes.map(exp => (
              <option key={exp.id} value={exp.id}>{exp.titulo}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>5. Formulario</label>
          <select
            value={selectedFormulario}
            onChange={e => setSelectedFormulario(e.target.value)}
            required
          >
            <option value="">Seleccione...</option>
            {formularios.map(f => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default FormAssignment
