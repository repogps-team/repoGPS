import { useState, useEffect } from 'react'
import { useEtapas } from '../../hooks/useEtapas'
import { useProcesos } from '../../hooks/useProcesos'
import { useUsuarios } from '../../hooks/useUsuarios'

const EtapasPanel = () => {
  const { etapas, cargarEtapas, crearEtapa, actualizarEtapa, cambiarEstado, eliminar } = useEtapas()
  const { procesos, cargarProcesos } = useProcesos()
  const { roles, cargarRoles } = useUsuarios()

  const [formData, setFormData] = useState({
    proceso_id: '',
    nombre: '',
    orden: '',
    tipo_etapa: '',
    tipo_tarea: '',
    rol_id: ''
  })
  const [editandoId, setEditandoId] = useState(null)
  const [tabActiva, setTabActiva] = useState('activos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    Promise.all([cargarEtapas(), cargarProcesos(), cargarRoles()])
  }, [cargarEtapas, cargarProcesos, cargarRoles])

  const limpiarBusqueda = () => setBusqueda('')

  const limpiarFormulario = () => {
    setFormData({
      proceso_id: '',
      nombre: '',
      orden: '',
      tipo_etapa: '',
      tipo_tarea: '',
      rol_id: ''
    })
    setEditandoId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((formData.tipo_tarea && !formData.rol_id) || (!formData.tipo_tarea && formData.rol_id)) {
      alert('Tipo de tarea y rol responsable deben definirse juntos')
      return
    }
    const payload = {
      proceso_id: Number(formData.proceso_id),
      nombre: formData.nombre,
      orden: Number(formData.orden),
      tipo_etapa: formData.tipo_etapa || null,
      tipo_tarea: formData.tipo_tarea || null,
      rol_id: formData.rol_id ? Number(formData.rol_id) : null
    }
    try {
      if (editandoId) {
        await actualizarEtapa(editandoId, payload)
      } else {
        await crearEtapa(payload)
      }
      limpiarFormulario()
      cargarEtapas()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    }
  }

  const handleEditar = (e) => {
    setFormData({
      proceso_id: String(e.proceso_id),
      nombre: e.nombre,
      orden: String(e.orden),
      tipo_etapa: e.tipo_etapa || '',
      tipo_tarea: e.tipo_tarea || '',
      rol_id: String(e.rol_id || '')
    })
    setEditandoId(e.id)
  }

  // Eliminar usa DELETE
  const handleEliminar = async (id) => {
    try {
      await eliminar(id)
      cargarEtapas()
      // Después de borrar, ir a inactivos
      setTabActiva('inactivos')
    } catch (err) {
      alert(err.message)
    }
  }

  // Reactivar usa PATCH
  const handleReactivar = async (id) => {
    try {
      await cambiarEstado(id, true)
      cargarEtapas()
    } catch (err) {
      alert(err.message)
    }
  }

  const filtrarData = () => {
    return etapas
      .filter(et => tabActiva === 'activos' ? et.estado_activo : !et.estado_activo)
      .filter(et => {
        const s = busqueda.toLowerCase()
        return et.nombre?.toLowerCase().includes(s)
      })
  }

  const getTitulo = () => editandoId ? 'Modificar' : 'Registrar'

  return (
    <>
      <section className="panel">
        <div className="panel-top">
          <h3>{getTitulo()} Etapa</h3>
        </div>
        <form onSubmit={handleSubmit} className="form-grid" id="etapa-form">
          <div className="field">
            <label>Proceso</label>
            <select value={formData.proceso_id} onChange={e => setFormData({ ...formData, proceso_id: e.target.value })} required>
              <option value="">Seleccione...</option>
              {procesos.filter(p => p.estado_activo).map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Nombre de la Etapa</label>
            <input type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
          </div>
          <div className="field">
            <label>Orden (secuencia)</label>
            <input type="number" min="1" value={formData.orden} onChange={e => setFormData({ ...formData, orden: e.target.value })} required />
          </div>
          <div className="field">
            <label>Tipo de etapa</label>
            <select value={formData.tipo_etapa} onChange={e => setFormData({ ...formData, tipo_etapa: e.target.value })}>
              <option value="">No aplica</option>
              <option value="inicio">Inicio</option>
              <option value="desarrollo">Desarrollo</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div className="field">
            <label>Tipo de tarea</label>
            <select value={formData.tipo_tarea} onChange={e => setFormData({ ...formData, tipo_tarea: e.target.value })}>
              <option value="">Sin tarea</option>
              <option value="revision">Revisión</option>
              <option value="aprobacion">Aprobación</option>
              <option value="visacion">Visación</option>
            </select>
          </div>
          <div className="field">
            <label>Rol responsable</label>
            <select
              value={formData.rol_id}
              onChange={e => setFormData({ ...formData, rol_id: e.target.value })}
              disabled={!formData.tipo_tarea}
            >
              <option value="">Sin asignar</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
          
        </form>
      </section>

      <div className="form-actions">
        <button type="submit" form="etapa-form" className="btn btn-primary">{editandoId ? 'Actualizar' : 'Crear'}</button>
        {editandoId && <button type="button" className="btn btn-secondary" onClick={limpiarFormulario}>Cancelar</button>}
      </div>

      <section className="panel">
        <div className="panel-top table-top">
          <div className="tabs">
            <button className={`tab-btn ${tabActiva === 'activos' ? 'active' : ''}`} onClick={() => { setTabActiva('activos'); limpiarBusqueda(); }}>Activos</button>
            <button className={`tab-btn ${tabActiva === 'inactivos' ? 'active' : ''}`} onClick={() => { setTabActiva('inactivos'); limpiarBusqueda(); }}>Inactivos</button>
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
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Orden</th>
                <th>Proceso</th>
                <th>Tipo Etapa</th>
                <th>Tipo Tarea</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrarData().map(etapa => {
                const proc = procesos.find(p => p.id === etapa.proceso_id)
                const rol = roles.find(r => r.id === etapa.rol_id)
                return (
                  <tr key={etapa.id}>
                    <td>{etapa.nombre}</td>
                    <td>{etapa.orden}</td>
                    <td>{proc?.nombre || 'Sin proceso'}</td>
                    <td>{etapa.tipo_etapa || '-'}</td>
                    <td>{etapa.tipo_tarea || '-'}</td>
                    <td>{rol?.nombre || '-'}</td>
                    <td>
                      <button className="btn-mini btn-edit" onClick={() => handleEditar(etapa)}>Editar</button>
                      <button className="btn-mini btn-danger" onClick={() => etapa.estado_activo ? handleEliminar(etapa.id) : handleReactivar(etapa.id)}>{etapa.estado_activo ? 'Borrar' : 'Reactivar'}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default EtapasPanel