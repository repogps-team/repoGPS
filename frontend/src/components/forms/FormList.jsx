import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import DataTable from '../shared/DataTable'

const FormList = () => {
  const navigate = useNavigate()
  const { get, patch } = useApi()

  const [formularios, setFormularios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const cargarFormularios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get('/api/forms')
      if (Array.isArray(data)) {
        setFormularios(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    cargarFormularios()
  }, [cargarFormularios])

  const handleToggleEstado = useCallback(async (id, estadoActual) => {
    try {
      await patch(`/api/forms/${id}/estado`, { estado_activo: !estadoActual })
      setMensaje(`Formulario ${!estadoActual ? 'activado' : 'desactivado'}`)
      cargarFormularios()
    } catch (err) {
      setError(err.message)
    }
  }, [patch, cargarFormularios])

  const columns = useMemo(() => [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      cell: (info) => info.getValue() || '-',
      meta: { priority: 'medium' }
    },
    {
      accessorKey: 'estado_activo',
      header: 'Estado',
      cell: (info) => (
        <span className={`role-tag ${info.getValue() ? '' : 'role-tag--inactive'}`}>
          {info.getValue() ? 'Activo' : 'Inactivo'}
        </span>
      ),
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'fecha_creacion',
      header: 'Fecha Creación',
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
      meta: { priority: 'medium' }
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: (info) => (
        <div className="actions-cell">
          <button className="btn-mini btn-edit" onClick={() => navigate(`/formularios/${info.row.original.id}/editar`)}>Editar</button>
          <button className="btn-mini btn-danger" onClick={() => handleToggleEstado(info.row.original.id, info.row.original.estado_activo)}>
            {info.row.original.estado_activo ? 'Desactivar' : 'Activar'}
          </button>
          <button className="btn-mini" onClick={() => navigate(`/formularios/${info.row.original.id}/respuestas`)}>Ver Respuestas</button>
        </div>
      ),
      meta: { priority: 'high' }
    }
  ], [navigate, handleToggleEstado])

  return (
    <section className="panel">
      <div className="panel-top">
        <h3>Formularios</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/formularios/crear')}>
            + Nuevo Formulario
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/formularios/asignar')}>
            Asignar Formulario
          </button>
        </div>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        data={formularios}
        columns={columns}
        config={{
          loading,
          searchable: true,
          searchPlaceholder: 'Buscar formulario...',
          sortable: true,
          pagination: true,
          pageSize: 10,
          emptyMessage: 'No hay formularios creados'
        }}
      />
    </section>
  )
}

export default FormList
