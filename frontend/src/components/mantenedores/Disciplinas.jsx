import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDisciplinas } from '../../hooks/useDisciplinas'
import DataTable from '../shared/DataTable'

const DisciplinasPanel = () => {
  const {
    disciplinas,
    areas,
    contratistas,
    cargarDisciplinas,
    cargarAreas,
    cargarContratistas,
    crearDisciplina,
    actualizarDisciplina,
    cambiarEstado
  } = useDisciplinas()

  const [formData, setFormData] = useState({ nombre: '', area_id: '', contratista_id: '' })
  const [editandoId, setEditandoId] = useState(null)
  const [tabActiva, setTabActiva] = useState('activos')

  useEffect(() => {
    Promise.all([cargarDisciplinas(), cargarAreas(), cargarContratistas()])
  }, [cargarDisciplinas, cargarAreas, cargarContratistas])

  const limpiarFormulario = () => {
    setFormData({ nombre: '', area_id: '', contratista_id: '' })
    setEditandoId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editandoId) {
        await actualizarDisciplina(editandoId, formData)
      } else {
        await crearDisciplina(formData)
      }
      limpiarFormulario()
      cargarDisciplinas()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEditar = useCallback((d) => {
    setFormData({ 
      nombre: d.nombre, 
      area_id: String(d.area_id), 
      contratista_id: String(d.contratista_id || '') 
    })
    setEditandoId(d.id)
  }, [])

  const handleCambiarEstado = useCallback(async (id, nuevoEstado) => {
    try {
      await cambiarEstado(id, nuevoEstado)
      cargarDisciplinas()
    } catch (err) {
      alert(err.message)
    }
  }, [cambiarEstado, cargarDisciplinas])

  const filteredData = useMemo(() => {
    return disciplinas.filter(d => tabActiva === 'activos' ? d.estado_activo : !d.estado_activo)
  }, [disciplinas, tabActiva])

  const columns = useMemo(() => [
    {
      accessorKey: 'nombre',
      header: 'Disciplina',
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'area_nombre',
      header: 'Área',
      cell: (info) => info.getValue() || 'No asignada',
      meta: { priority: 'medium' }
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: (info) => (
        <div className="actions-cell">
          <button className="btn-mini btn-edit" onClick={() => handleEditar(info.row.original)}>Editar</button>
          <button className="btn-mini btn-danger" onClick={() => handleCambiarEstado(info.row.original.id, !info.row.original.estado_activo)}>
            {info.row.original.estado_activo ? 'Borrar' : 'Reactivar'}
          </button>
        </div>
      ),
      meta: { priority: 'high' }
    }
  ], [handleEditar, handleCambiarEstado])

  const getTitulo = () => editandoId ? 'Modificar' : 'Registrar'

  return (
    <>
      <section className="panel">
        <div className="panel-top">
          <h3>{getTitulo()} Disciplina</h3>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Nombre de la Disciplina</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Contratista</label>
            <select 
              value={formData.contratista_id} 
              onChange={e => setFormData({ ...formData, contratista_id: e.target.value, area_id: '' })} 
              required
            >
              <option value="">Seleccione...</option>
              {contratistas.filter(c => c.estado_activo).map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Área</label>
            <select 
              value={formData.area_id} 
              onChange={e => setFormData({ ...formData, area_id: e.target.value })} 
              required
              disabled={!formData.contratista_id}
            >
              <option value="">Seleccione...</option>
              {areas.filter(a => a.contratista_id === Number(formData.contratista_id) && a.estado_activo).map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editandoId ? 'Actualizar' : 'Crear'}</button>
            {editandoId && <button type="button" className="btn btn-secondary" onClick={limpiarFormulario}>Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-top table-top">
          <div className="tabs">
            <button className={`tab-btn ${tabActiva === 'activos' ? 'active' : ''}`} onClick={() => setTabActiva('activos')}>Activos</button>
            <button className={`tab-btn ${tabActiva === 'inactivos' ? 'active' : ''}`} onClick={() => setTabActiva('inactivos')}>Inactivos</button>
          </div>
        </div>
        <DataTable
          data={filteredData}
          columns={columns}
          config={{
            searchable: true,
            searchPlaceholder: 'Buscar disciplina...',
            sortable: true,
            pagination: true,
            pageSize: 10,
            emptyMessage: 'No hay disciplinas en esta categoría'
          }}
        />
      </section>
    </>
  )
}

export default DisciplinasPanel
