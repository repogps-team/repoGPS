import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import DataTable from '../components/shared/DataTable'

const ROLES = [
  { id: 1, nombre: 'Admin' },
  { id: 2, nombre: 'Aprobador' },
  { id: 3, nombre: 'Visador' },
  { id: 4, nombre: 'Colaborador' },
]

const AdminTransiciones = () => {
  const { get, post, del } = useApi()

  const [procesos, setProcesos] = useState([])
  const [selectedProceso, setSelectedProceso] = useState('')
  const [etapas, setEtapas] = useState([])
  const [reglas, setReglas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const [newEtapaFrom, setNewEtapaFrom] = useState('')
  const [newEtapaTo, setNewEtapaTo] = useState('')
  const [newRol, setNewRol] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const cargarProcesos = async () => {
      try {
        const data = await get('/api/procesos?incluir_inactivos=true')
        if (Array.isArray(data)) setProcesos(data)
      } catch (err) {
        setError(err.message)
      }
    }
    cargarProcesos()
  }, [get])

  const cargarEtapas = useCallback(async (procesoId) => {
    if (!procesoId) {
      setEtapas([])
      return
    }
    try {
      const data = await get(`/api/etapas-proceso/proceso/${procesoId}`)
      if (Array.isArray(data)) setEtapas(data)
    } catch (err) {
      console.error('Error al cargar etapas:', err)
    }
  }, [get])

  const cargarReglas = useCallback(async (procesoId) => {
    if (!procesoId) {
      setReglas([])
      return
    }
    try {
      const data = await get(`/api/admin/transiciones-permitidas?proceso_id=${procesoId}`)
      if (Array.isArray(data)) setReglas(data)
    } catch (err) {
      setError(err.message)
    }
  }, [get])

  const handleProcesoChange = async (e) => {
    const value = e.target.value
    setSelectedProceso(value)
    setError(null)
    setMensaje(null)
    setNewEtapaFrom('')
    setNewEtapaTo('')
    setNewRol('')

    if (value) {
      setLoading(true)
      await Promise.all([
        cargarEtapas(value),
        cargarReglas(value),
      ])
      setLoading(false)
    } else {
      setEtapas([])
      setReglas([])
    }
  }

  const handleAgregarRegla = async (e) => {
    e.preventDefault()
    setError(null)
    setMensaje(null)

    if (!newEtapaFrom || !newEtapaTo || !newRol) {
      setError('Debe seleccionar etapa origen, etapa destino y rol')
      return
    }

    if (newEtapaFrom === newEtapaTo) {
      setError('La etapa origen y destino deben ser diferentes')
      return
    }

    setSubmitting(true)
    try {
      await post('/api/admin/transiciones-permitidas', {
        proceso_id: parseInt(selectedProceso),
        etapa_from_id: parseInt(newEtapaFrom),
        etapa_to_id: parseInt(newEtapaTo),
        rol_id: parseInt(newRol),
      })
      setMensaje('Regla de transicion creada correctamente')
      setNewEtapaFrom('')
      setNewEtapaTo('')
      setNewRol('')
      await cargarReglas(selectedProceso)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminarRegla = async (id) => {
    if (!window.confirm('¿Esta seguro de eliminar esta regla de transicion?')) return

    setError(null)
    setMensaje(null)
    try {
      await del(`/api/admin/transiciones-permitidas/${id}`)
      setMensaje('Regla de transicion eliminada')
      await cargarReglas(selectedProceso)
    } catch (err) {
      setError(err.message)
    }
  }

  const getRolNombre = (rolId) => {
    const rol = ROLES.find(r => r.id === rolId)
    return rol ? rol.nombre : `Rol #${rolId}`
  }

  const columns = useMemo(() => [
    {
      accessorKey: 'etapa_from_nombre',
      header: 'Etapa Origen',
      cell: (info) => info.getValue() || `Etapa #${info.row.original.etapa_from_id}`,
      meta: { priority: 'high' }
    },
    {
      id: 'flecha',
      header: '→',
      cell: () => '→',
      enableSorting: false,
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'etapa_to_nombre',
      header: 'Etapa Destino',
      cell: (info) => info.getValue() || `Etapa #${info.row.original.etapa_to_id}`,
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'rol_id',
      header: 'Rol Permitido',
      cell: (info) => <span className="role-tag">{getRolNombre(info.getValue())}</span>,
      meta: { priority: 'medium' }
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: (info) => (
        <button className="btn-mini btn-danger" onClick={() => handleEliminarRegla(info.row.original.id)}>
          Eliminar
        </button>
      ),
      meta: { priority: 'high' }
    }
  ], [selectedProceso])

  return (
    <section className="panel">
      <div className="panel-top">
        <h3>Administrar Transiciones por Rol</h3>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Seleccionar Proceso</label>
        <select value={selectedProceso} onChange={handleProcesoChange}>
          <option value="">Seleccione un proceso...</option>
          {procesos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {selectedProceso && (
        <>
          <div className="exp-section" style={{ marginTop: '16px' }}>
            <h4>Agregar Regla de Transicion</h4>
            <form onSubmit={handleAgregarRegla} className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
              <div className="field">
                <label>Etapa Origen</label>
                <select value={newEtapaFrom} onChange={e => setNewEtapaFrom(e.target.value)} required>
                  <option value="">Seleccione...</option>
                  {etapas.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Etapa Destino</label>
                <select value={newEtapaTo} onChange={e => setNewEtapaTo(e.target.value)} required>
                  <option value="">Seleccione...</option>
                  {etapas.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Rol Permitido</label>
                <select value={newRol} onChange={e => setNewRol(e.target.value)} required>
                  <option value="">Seleccione...</option>
                  {ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions" style={{ alignSelf: 'end', margin: 0 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Agregando...' : '+ Agregar'}
                </button>
              </div>
            </form>
          </div>

          <div style={{ marginTop: '16px' }}>
            <h4>Reglas Existentes</h4>
            <DataTable
              data={reglas}
              columns={columns}
              config={{
                loading,
                searchable: true,
                searchPlaceholder: 'Buscar regla...',
                sortable: true,
                pagination: true,
                pageSize: 10,
                emptyMessage: 'No hay reglas de transicion para este proceso. Agregue una arriba.'
              }}
            />
          </div>
        </>
      )}
    </section>
  )
}

export default AdminTransiciones
