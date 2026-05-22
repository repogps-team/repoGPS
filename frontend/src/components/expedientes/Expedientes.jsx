import { useState, useEffect, useCallback } from 'react'
import { useExpedientes } from '../../hooks/useExpedientes'
import { useProcesos } from '../../hooks/useProcesos'
import { useDisciplinas } from '../../hooks/useDisciplinas'
import { useApi } from '../../hooks/useApi'
import { useContratistas } from '../../hooks/useContratistas'
import ExpedienteDetalle from './ExpedienteDetalle'

const ExpedientesPanel = ({ user, filtroEstadoInicial = 'todos', filtroSlaInicial = 'todos' }) => {
  const { get } = useApi()
  const {
    expedientes,
    expedienteDetalle,
    historial,
    documentos,
    cargarExpedientes,
    crearExpediente,
    abrirDetalle,
    cerrarDetalle,
    avanzarExpediente,
    devolverExpediente,
    actualizarFechaTermino,
    refreshDocumentos
  } = useExpedientes()
  const { procesos, cargarProcesos } = useProcesos()
  const { cargarDisciplinas } = useDisciplinas()
  const { contratistas, cargarContratistas } = useContratistas()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [formData, setFormData] = useState({
    contratista_id: '',
    area_id: '',
    proceso_id: '',
    disciplina_id: '',
    titulo: '',
    descripcion: '',
    fecha_termino: ''
  })
  const [etapasProceso, setEtapasProceso] = useState([])
  const handleDocumentoUploaded = useCallback(() => {
    if (expedienteDetalle?.id) {
      refreshDocumentos(expedienteDetalle.id)
    }
  }, [expedienteDetalle, refreshDocumentos])

  const [filtroEstado, setFiltroEstado] = useState(filtroEstadoInicial)
  const [filtroSla, setFiltroSla] = useState(filtroSlaInicial)
  const [filtroProceso, setFiltroProceso] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Listas filtradas para selects en cascada
  const [areasFiltradas, setAreasFiltradas] = useState([])
  const [disciplinasFiltradas, setDisciplinasFiltradas] = useState([])
  const [procesosFiltrados, setProcesosFiltrados] = useState([])

  // Es admin?
  const esAdmin = user?.rol_id === 1

  // Cargar opciones iniciales
  useEffect(() => {
    Promise.all([cargarExpedientes(), cargarProcesos(), cargarDisciplinas(), cargarContratistas()])
  }, [cargarExpedientes, cargarProcesos, cargarDisciplinas, cargarContratistas])


  // Cargar áreas cuando se selecciona un contratista
  const cargarAreasPorContratista = useCallback(async (contratistaId) => {
    if (!contratistaId) {
      setAreasFiltradas([])
      setFormData(prev => ({ ...prev, area_id: '', disciplina_id: '', proceso_id: '' }))
      setDisciplinasFiltradas([])
      return
    }
    try {
      const data = await get(`/api/areas/contratista/${contratistaId}`)
      if (Array.isArray(data)) {
        setAreasFiltradas(data)
      }
    } catch (err) {
      console.error('Error al cargar áreas:', err)
      setAreasFiltradas([])
    }
  }, [get])

  // Cargar disciplinas cuando se selecciona un área
  const cargarDisciplinasPorArea = useCallback(async (areaId) => {
    if (!areaId) {
      setDisciplinasFiltradas([])
      setFormData(prev => ({ ...prev, disciplina_id: '', proceso_id: '' }))
      return
    }
    try {
      const data = await get(`/api/disciplinas/area/${areaId}`)
      if (Array.isArray(data)) {
        setDisciplinasFiltradas(data)
      }
    } catch (err) {
      console.error('Error al cargar disciplinas:', err)
      setDisciplinasFiltradas([])
    }
  }, [get])

  // Cargar procesos cuando se selecciona un área
  const cargarProcesosPorArea = useCallback(async (areaId) => {
    if (!areaId) {
      setProcesosFiltrados([])
      return
    }
    try {
      // Cargar todos los procesos (activos e inactivos) y filtrar en el frontend
      const data = await get(`/api/procesos?incluir_inactivos=true`)
      if (Array.isArray(data)) {
        const filtrados = data.filter(p => p.area_id === Number(areaId))
        setProcesosFiltrados(filtrados)
      }
    } catch (err) {
      console.error('Error al cargar procesos:', err)
      setProcesosFiltrados([])
    }
  }, [get])

  // Cargar etapas cuando se selecciona un proceso
  const cargarEtapasProceso = useCallback(async (procesoId) => {
    if (!procesoId) {
      setEtapasProceso([])
      return
    }
    try {
      const data = await get(`/api/etapas-proceso/proceso/${procesoId}`)
      if (Array.isArray(data)) {
        setEtapasProceso(data)
      }
    } catch (err) {
      console.error('Error al cargar etapas:', err)
    }
  }, [get])

  // Handlers para cambios en selects
  const handleContratistaChange = async (e) => {
    const contratistaId = e.target.value
    setFormData(prev => ({ ...prev, contratista_id: contratistaId, area_id: '', disciplina_id: '', proceso_id: '' }))
    setAreasFiltradas([])
    setDisciplinasFiltradas([])
    setProcesosFiltrados([])
    setEtapasProceso([])
    if (contratistaId) {
      await cargarAreasPorContratista(contratistaId)
    }
  }

  const handleAreaChange = async (e) => {
    const areaId = e.target.value
    setFormData(prev => ({ ...prev, area_id: areaId, disciplina_id: '', proceso_id: '' }))
    setDisciplinasFiltradas([])
    setProcesosFiltrados([])
    setEtapasProceso([])
    if (areaId) {
      await cargarDisciplinasPorArea(areaId)
      await cargarProcesosPorArea(areaId)
    }
  }

  const handleDisciplinaChange = (e) => {
    setFormData(prev => ({ ...prev, disciplina_id: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Verificar que el proceso tenga etapas activas
    if (etapasProceso.length === 0) {
      alert('No se puede crear el expediente. El proceso seleccionado no tiene etapas activas.\n\nCree etapas en el módulo de Etapas primero.')
      return
    }
    
    try {
      await crearExpediente(formData)
      setMostrarForm(false)
      setFormData({ contratista_id: '', area_id: '', proceso_id: '', disciplina_id: '', titulo: '', descripcion: '', fecha_termino: '' })
      setAreasFiltradas([])
      setDisciplinasFiltradas([])
      setProcesosFiltrados([])
      setEtapasProceso([])
      cargarExpedientes()
    } catch (err) {
      alert(err.message)
    }
  }

  const filtrarData = () => {
    // Filtrar por área si no es admin
    let filtered = esAdmin
      ? expedientes
      : expedientes.filter(e => e.area_id === user?.area_id)

    return filtered
      .filter(e => {
        if (!filtroEstado || filtroEstado === 'todos') return true
        // filtroEstado holds backend estado values: 'Pendiente','En Desarrollo','Terminado'
        return e.estado === filtroEstado
      })
      .filter(e => {
        if (!filtroSla || filtroSla === 'todos') return true
        if (e.estado !== 'En Desarrollo') return false
        const ahora = Date.now()
        if (e.fecha_termino) {
          const fechaTermino = new Date(e.fecha_termino).getTime()
          if (filtroSla === 'atrasado') return ahora > fechaTermino
          if (filtroSla === 'en_plazo') return ahora <= fechaTermino
          return true
        }
        const fechaExp = e.fecha_actualizacion || e.fecha_creacion
        const diasTranscurridos = Math.floor((ahora - new Date(fechaExp)) / (1000 * 60 * 60 * 24))
        if (filtroSla === 'atrasado') return diasTranscurridos > 10
        if (filtroSla === 'en_plazo') return diasTranscurridos <= 10
        return true
      })
      .filter(e => !filtroProceso || e.proceso_id === Number(filtroProceso))
      .filter(e => {
        const s = busqueda.toLowerCase()
        return e.titulo?.toLowerCase().includes(s) || e.proceso_nombre?.toLowerCase().includes(s)
      })
  }

  return (
    <>
      {esAdmin && (
        <section className="panel">
          <div className="panel-top">
            <h3>Registrar Expediente</h3>
            <button className="btn btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? 'Cancelar' : '+ Nuevo Expediente'}
            </button>
          </div>

          {mostrarForm && (
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="field">
                <label>Contratista</label>
                <select value={formData.contratista_id} onChange={handleContratistaChange} required>
                  <option value="">Seleccione...</option>
                  {contratistas.filter(c => c.estado_activo).map(c => (
                    <option key={c.id} value={c.id}>{c.razon_social}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Área</label>
                <select
                  value={formData.area_id}
                  onChange={handleAreaChange}
                  required
                  disabled={!formData.contratista_id}
                >
                  <option value="">Seleccione...</option>
                  {areasFiltradas.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

<div className="field">
                  <label>Disciplina</label>
                  <select
                    value={formData.disciplina_id}
                    onChange={handleDisciplinaChange}
                    required
                    disabled={!formData.area_id}
                  >
                    <option value="">Seleccione...</option>
                    {disciplinasFiltradas.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Proceso</label>
                  <select value={formData.proceso_id} onChange={async e => {
                    const procesoId = e.target.value
                    setFormData(prev => ({ ...prev, proceso_id: procesoId }))
                    if (procesoId) {
                      await cargarEtapasProceso(procesoId)
                    } else {
                      setEtapasProceso([])
                    }
                  }} required disabled={!formData.area_id}>
                    <option value="">Seleccione...</option>
                    {procesosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {formData.proceso_id && etapasProceso.length === 0 && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                      Este proceso no tiene etapas activas. El expediente no podrá avanzar.
                    </p>
                  )}
                </div>

                <div className="field">
                <label>Título</label>
                <input type="text" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} required />
              </div>

              <div className="field">
                <label>Descripción</label>
                <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
              </div>

              <div className="field">
                <label>Fecha de término (opcional)</label>
                <input
                  type="date"
                  value={formData.fecha_termino}
                  onChange={e => setFormData({ ...formData, fecha_termino: e.target.value })}
                />
              </div>

              {formData.proceso_id && etapasProceso.length > 0 && (
                <div className="field">
                  <label>Etapa Inicial (se asigna automáticamente)</label>
                  <input type="text" value={etapasProceso[0]?.nombre || ''} disabled />
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Crear Expediente</button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="panel">
        <div className="panel-top table-top">
          <div className="filter-group">
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Desarrollo">En Desarrollo</option>
              <option value="Terminado">Terminado</option>
            </select>
            <select value={filtroSla} onChange={e => setFiltroSla(e.target.value)}>
              <option value="todos">Plazo: Todos</option>
              <option value="en_plazo">Plazo: En plazo</option>
              <option value="atrasado">Plazo: Atrasado</option>
            </select>
            <select value={filtroProceso} onChange={e => setFiltroProceso(e.target.value)}>
              <option value="">Todos los Procesos</option>
              {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="table-controls">
            <div className="search-wrapper">
              <span className="search-icon"></span>
              <input 
                type="text" 
                className="search-input"
                placeholder="Buscar..." 
                value={busqueda} 
                onChange={e => setBusqueda(e.target.value)} 
              />
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Proceso</th>
                <th>Etapa Actual</th>
                <th>Fecha Creación</th>
                <th>Plazo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrarData().map(exp => (
                <tr key={exp.id}>
                  <td>{exp.titulo}</td>
                  <td>{exp.proceso_nombre || '-'}</td>
                  <td><span className="role-tag">{exp.estado}</span></td>
                  <td>{new Date(exp.fecha_creacion).toLocaleDateString()}</td>
                  <td>
                    {exp.estado === 'En Desarrollo' ? (
                      (() => {
                        const ahora = Date.now()
                        if (exp.fecha_termino) {
                          const fechaTermino = new Date(exp.fecha_termino).getTime()
                          const diffMs = fechaTermino - ahora
                          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                          const enPlazo = diffMs >= 0
                          return (
                            <span className={`sla-tag ${enPlazo ? 'sla-ok' : 'sla-warn'}`}>
                              {enPlazo ? `En plazo (${diffDias}d)` : `Atrasado (${Math.abs(diffDias)}d)`}
                            </span>
                          )
                        }
                        const fechaExp = exp.fecha_actualizacion || exp.fecha_creacion
                        const diasTranscurridos = Math.floor((ahora - new Date(fechaExp)) / (1000 * 60 * 60 * 24))
                        const restantes = Math.max(10 - diasTranscurridos, 0)
                        const enPlazo = diasTranscurridos <= 10
                        return (
                          <span className={`sla-tag ${enPlazo ? 'sla-ok' : 'sla-warn'}`}>
                            {enPlazo ? `En plazo (${restantes}d)` : `Atrasado (${diasTranscurridos - 10}d)`}
                          </span>
                        )
                      })()
                    ) : (
                      <span className="sla-tag sla-neutral">-</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-mini btn-edit" onClick={() => abrirDetalle(exp)}>Ver Detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {expedienteDetalle && (
        <ExpedienteDetalle
          expediente={expedienteDetalle}
          historial={historial}
          documentos={documentos}
          onCerrar={cerrarDetalle}
          onAvanzar={avanzarExpediente}
          onDevolver={devolverExpediente}
          onDocumentoUploaded={handleDocumentoUploaded}
          onActualizarFechaTermino={async (id, fecha_termino) => {
            const updated = await actualizarFechaTermino(id, fecha_termino)
            if (updated) {
              abrirDetalle({ ...expedienteDetalle, fecha_termino: updated.fecha_termino })
            }
          }}
          esAdmin={esAdmin}
        />
      )}
    </>
  )
}

export default ExpedientesPanel
