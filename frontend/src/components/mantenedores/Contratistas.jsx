import { useState, useEffect, useMemo, useCallback } from 'react'
import { useContratistas } from '../../hooks/useContratistas'
import DataTable from '../shared/DataTable'

const ContratistasPanel = () => {
  const {
    contratistas,
    cargarContratistas,
    crearContratista,
    actualizarContratista,
    cambiarEstado
  } = useContratistas()

  const [formData, setFormData] = useState({ razon_social: '', rut: '' })
  const [editandoId, setEditandoId] = useState(null)
  const [tabActiva, setTabActiva] = useState('activos')
  const [errorRut, setErrorRut] = useState('')

  useEffect(() => {
    cargarContratistas()
  }, [cargarContratistas])

  const limpiarFormulario = () => {
    setFormData({ razon_social: '', rut: '' })
    setEditandoId(null)
    setErrorRut('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorRut('')
    try {
      if (editandoId) {
        await actualizarContratista(editandoId, formData)
      } else {
        await crearContratista(formData)
      }
      limpiarFormulario()
      cargarContratistas()
    } catch (err) {
      if (err.message.includes('RUT')) {
        setErrorRut(err.message)
      } else {
        alert(err.message)
      }
    }
  }

  const handleEditar = useCallback((c) => {
    setFormData({ razon_social: c.razon_social, rut: c.rut })
    setEditandoId(c.id)
  }, [])

  const handleCambiarEstado = useCallback(async (id, nuevoEstado) => {
    try {
      await cambiarEstado(id, nuevoEstado)
      cargarContratistas()
    } catch (err) {
      alert(err.message)
    }
  }, [cambiarEstado, cargarContratistas])

  const filteredData = useMemo(() => {
    return contratistas.filter(c => tabActiva === 'activos' ? c.estado_activo : !c.estado_activo)
  }, [contratistas, tabActiva])

  const columns = useMemo(() => [
    {
      accessorKey: 'razon_social',
      header: 'Razón Social',
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'rut',
      header: 'RUT',
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
          <h3>{getTitulo()} Contratista</h3>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Razón Social</label>
            <input
              type="text"
              value={formData.razon_social}
              onChange={e => setFormData({ ...formData, razon_social: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>RUT</label>
            <input
              type="text"
              value={formData.rut}
              onChange={e => { setFormData({ ...formData, rut: e.target.value }); setErrorRut(''); }}
              required
            />
            {errorRut && <span style={{ color: '#e74c3c', fontSize: '12px', display: 'block', marginTop: '4px' }}>{errorRut}</span>}
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
            searchPlaceholder: 'Buscar contratista...',
            sortable: true,
            pagination: true,
            pageSize: 10,
            emptyMessage: 'No hay contratistas en esta categoría'
          }}
        />
      </section>
    </>
  )
}

export default ContratistasPanel
