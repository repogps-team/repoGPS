import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAreas } from '../../hooks/useAreas'
import { useUsuarios } from '../../hooks/useUsuarios'
import DataTable from '../shared/DataTable'

const AreasPanel = () => {
  const {
    areas,
    contratistas,
    cargarAreas,
    cargarContratistas,
    crearArea,
    actualizarArea,
    cambiarEstado
  } = useAreas()

  const {
    usuarios,
    usuariosSinArea,
    cargarUsuarios,
    asignarArea
  } = useUsuarios()

  const [formData, setFormData] = useState({ nombre: '', contratista_id: '' })
  const [editandoId, setEditandoId] = useState(null)
  const [tabActiva, setTabActiva] = useState('activos')

  // Panel de usuarios por área
  const [areaSeleccionada, setAreaSeleccionada] = useState(null)
  const [tabUsuarios, setTabUsuarios] = useState('asignados')

  useEffect(() => {
    Promise.all([cargarAreas(), cargarContratistas(), cargarUsuarios()])
  }, [cargarAreas, cargarContratistas, cargarUsuarios])

  const limpiarFormulario = () => {
    setFormData({ nombre: '', contratista_id: '' })
    setEditandoId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editandoId) {
        await actualizarArea(editandoId, formData)
      } else {
        await crearArea(formData)
      }
      limpiarFormulario()
      cargarAreas()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEditar = useCallback((a) => {
    setFormData({ nombre: a.nombre, contratista_id: String(a.contratista_id) })
    setEditandoId(a.id)
  }, [])

  const handleCambiarEstado = useCallback(async (id, nuevoEstado) => {
    try {
      await cambiarEstado(id, nuevoEstado)
      cargarAreas()
    } catch (err) {
      alert(err.message)
    }
  }, [cambiarEstado, cargarAreas])

  const filteredAreas = useMemo(() => {
    return areas.filter(a => tabActiva === 'activos' ? a.estado_activo : !a.estado_activo)
  }, [areas, tabActiva])

  const areasColumns = useMemo(() => [
    {
      accessorKey: 'nombre',
      header: 'Área',
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'contratista_nombre',
      header: 'Empresa',
      cell: (info) => info.getValue() || 'No asignada',
      meta: { priority: 'medium' }
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: (info) => (
        <div className="actions-cell">
          <button className="btn-mini btn-edit" onClick={(e) => { e.stopPropagation(); handleEditar(info.row.original); }}>Editar</button>
          <button className="btn-mini btn-danger" onClick={(e) => { e.stopPropagation(); handleCambiarEstado(info.row.original.id, !info.row.original.estado_activo); }}>
            {info.row.original.estado_activo ? 'Borrar' : 'Reactivar'}
          </button>
        </div>
      ),
      meta: { priority: 'high' }
    }
  ], [handleEditar, handleCambiarEstado])

  // ============================================
  // HANDLERS USUARIOS (HU-20)
  // ============================================

  const usuariosEnArea = useMemo(() => {
    return usuarios.filter(u => u.area_id === areaSeleccionada && u.estado_activo)
  }, [usuarios, areaSeleccionada])

  const usuariosFiltrados = useMemo(() => {
    let lista = tabUsuarios === 'asignados' ? usuariosEnArea : usuariosSinArea
    return lista
  }, [usuariosEnArea, usuariosSinArea, tabUsuarios])

  const handleAsignarUsuario = useCallback(async (usuarioId, areaId) => {
    try {
      await asignarArea(usuarioId, areaId)
      await cargarUsuarios()
    } catch (err) {
      alert(err.message)
    }
  }, [asignarArea, cargarUsuarios])

  const handleDesasignarUsuario = useCallback(async (usuarioId) => {
    try {
      await asignarArea(usuarioId, null)
      await cargarUsuarios()
    } catch (err) {
      alert(err.message)
    }
  }, [asignarArea, cargarUsuarios])

  const usuariosColumns = useMemo(() => [
    {
      accessorKey: 'nombre_completo',
      header: 'Nombre',
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'correo',
      header: 'Correo',
      meta: { priority: 'medium' }
    },
    {
      accessorKey: 'rol_nombre',
      header: 'Rol',
      cell: (info) => <span className="role-tag">{info.getValue()}</span>,
      meta: { priority: 'high' }
    },
    {
      id: 'accion',
      header: 'Acción',
      enableSorting: false,
      cell: (info) => (
        <div className="actions-cell">
          {tabUsuarios === 'asignados' ? (
            <button className="btn-mini btn-danger" onClick={() => handleDesasignarUsuario(info.row.original.id)}>
              Desasignar
            </button>
          ) : (
            <button className="btn-mini btn-primary" onClick={() => handleAsignarUsuario(info.row.original.id, areaSeleccionada)}>
              Asignar
            </button>
          )}
        </div>
      ),
      meta: { priority: 'high' }
    }
  ], [tabUsuarios, areaSeleccionada, handleAsignarUsuario, handleDesasignarUsuario])

  const getTitulo = () => editandoId ? 'Modificar' : 'Registrar'

  return (
    <>
      <section className="panel">
        <div className="panel-top">
          <h3>{getTitulo()} Área</h3>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Nombre del Área</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Empresa Contratista</label>
            <select
              value={formData.contratista_id}
              onChange={e => setFormData({ ...formData, contratista_id: e.target.value })}
              required
            >
              <option value="">Seleccione...</option>
              {contratistas.filter(c => c.estado_activo).map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
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
        <div className="hint-bar">Click en un área para asignar usuarios</div>
        <DataTable
          data={filteredAreas}
          columns={areasColumns}
          config={{
            searchable: true,
            searchPlaceholder: 'Buscar área...',
            sortable: true,
            pagination: true,
            pageSize: 10,
            emptyMessage: 'No hay áreas en esta categoría',
            onRowClick: (row) => setAreaSeleccionada(areaSeleccionada === row.original.id ? null : row.original.id),
            rowClassName: (row) => row.original.id === areaSeleccionada ? 'selected-row' : ''
          }}
        />
      </section>

      {/* Panel de Usuarios - Solo visible cuando hay un área seleccionada */}
      {areaSeleccionada && (
        <>
          <section className="panel">
            <div className="panel-top">
              <h3>Asignar Usuarios</h3>
              <span className="category-badge">
                Área: {areas.find(a => a.id === areaSeleccionada)?.nombre}
              </span>
            </div>
            <div className="tabs" style={{ marginTop: '15px' }}>
              <button
                className={`tab-btn ${tabUsuarios === 'asignados' ? 'active' : ''}`}
                onClick={() => setTabUsuarios('asignados')}
              >
                Asignados ({usuariosEnArea.length})
              </button>
              <button
                className={`tab-btn ${tabUsuarios === 'disponibles' ? 'active' : ''}`}
                onClick={() => setTabUsuarios('disponibles')}
              >
                Disponibles ({usuariosSinArea.length})
              </button>
            </div>
            <DataTable
              data={usuariosFiltrados}
              columns={usuariosColumns}
              config={{
                searchable: true,
                searchPlaceholder: 'Buscar usuario...',
                sortable: true,
                pagination: true,
                pageSize: 10,
                emptyMessage: tabUsuarios === 'asignados' ? 'No hay usuarios asignados a esta área' : 'No hay usuarios sin área disponible'
              }}
            />
          </section>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button
              className="btn btn-outline"
              onClick={() => { setAreaSeleccionada(null); setTabUsuarios('asignados'); }}
            >
              Cerrar panel
            </button>
          </div>
        </>
      )}
    </>
  )
}

export default AreasPanel
