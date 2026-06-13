import { useState, useEffect, useMemo } from 'react'
import { useUsuarios } from '../../hooks/useUsuarios'
import DataTable from '../shared/DataTable'

const UsuariosPanel = () => {
  const {
    usuarios,
    roles,
    cargarUsuarios,
    cargarRoles,
    crearUsuario,
    actualizarUsuario,
    cambiarEstado
  } = useUsuarios()

  const [formData, setFormData] = useState({
    rol_id: '',
    area_id: '',
    nombre_completo: '',
    correo: '',
    password_hash: '123456'
  })
  const [editandoId, setEditandoId] = useState(null)
  const [tabActiva, setTabActiva] = useState('activos')

  useEffect(() => {
    Promise.all([cargarUsuarios(), cargarRoles()])
  }, [cargarUsuarios, cargarRoles])

  const limpiarFormulario = () => {
    setFormData({
      rol_id: '',
      area_id: '',
      nombre_completo: '',
      correo: '',
      password_hash: '123456'
    })
    setEditandoId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editandoId) {
        await actualizarUsuario(editandoId, formData)
      } else {
        await crearUsuario(formData)
      }
      limpiarFormulario()
      cargarUsuarios()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEditar = (u) => {
    setFormData({
      rol_id: String(u.rol_id),
      area_id: String(u.area_id),
      nombre_completo: u.nombre_completo,
      correo: u.correo,
      password_hash: u.password_hash || '123456'
    })
    setEditandoId(u.id)
  }

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await cambiarEstado(id, nuevoEstado)
      cargarUsuarios()
    } catch (err) {
      alert(err.message)
    }
  }

  const filteredData = useMemo(() => {
    return usuarios.filter(u => tabActiva === 'activos' ? u.estado_activo : !u.estado_activo)
  }, [usuarios, tabActiva])

  const columns = useMemo(() => [
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
  ], [])

  const getTitulo = () => editandoId ? 'Modificar' : 'Registrar'

  return (
    <>
      <section className="panel">
        <div className="panel-top">
          <h3>{getTitulo()} Usuario</h3>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Nombre Completo</label>
            <input
              type="text"
              value={formData.nombre_completo}
              onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Correo</label>
            <input
              type="email"
              value={formData.correo}
              onChange={e => setFormData({ ...formData, correo: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Rol</label>
            <select
              value={formData.rol_id}
              onChange={e => setFormData({ ...formData, rol_id: e.target.value })}
              required
            >
              <option value="">Seleccione...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn btn-primary">{editandoId ? 'Actualizar' : 'Crear'}</button>
            {editandoId && <button type="button" className="btn btn-secondary" onClick={limpiarFormulario}>Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-top">
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
            searchPlaceholder: 'Buscar por nombre, correo o rol...',
            sortable: true,
            pagination: true,
            pageSize: 10,
            emptyMessage: 'No hay usuarios en esta categoría'
          }}
        />
      </section>
    </>
  )
}

export default UsuariosPanel
