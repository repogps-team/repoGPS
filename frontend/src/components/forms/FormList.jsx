import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'

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

  const handleToggleEstado = async (id, estadoActual) => {
    try {
      await patch(`/api/forms/${id}/estado`, { estado_activo: !estadoActual })
      setMensaje(`Formulario ${!estadoActual ? 'activado' : 'desactivado'}`)
      cargarFormularios()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleVerRespuestas = (id) => {
    navigate(`/formularios/${id}/respuestas`)
  }

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

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {formularios.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <p className="empty-text">No hay formularios creados</p>
                  </td>
                </tr>
              ) : (
                formularios.map(f => (
                  <tr key={f.id}>
                    <td>{f.nombre}</td>
                    <td>{f.descripcion || '-'}</td>
                    <td>
                      <span className={`role-tag ${f.estado_activo ? '' : 'role-tag--inactive'}`}>
                        {f.estado_activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{new Date(f.fecha_creacion).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-mini btn-edit"
                        onClick={() => navigate(`/formularios/${f.id}/editar`)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-mini btn-danger"
                        onClick={() => handleToggleEstado(f.id, f.estado_activo)}
                        style={{ marginLeft: '4px' }}
                      >
                        {f.estado_activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="btn-mini"
                        onClick={() => handleVerRespuestas(f.id)}
                        style={{ marginLeft: '4px' }}
                      >
                        Ver Respuestas
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default FormList
