import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'

const FormResponses = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { get } = useApi()

  const [respuestas, setRespuestas] = useState([])
  const [formDefinition, setFormDefinition] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedRespuesta, setSelectedRespuesta] = useState(null)

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      setError(null)
      try {
        const [formData, respuestasData] = await Promise.all([
          get(`/api/forms/${id}`),
          get(`/api/forms/${id}/respuestas`)
        ])
        setFormDefinition(formData)
        if (Array.isArray(respuestasData)) {
          setRespuestas(respuestasData)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    cargarDatos()
  }, [id, get])

  const handleVerRespuesta = (respuesta) => {
    setSelectedRespuesta(respuesta)
  }

  return (
    <section className="panel">
      <div className="panel-top">
        <h3>Respuestas - {formDefinition?.nombre || 'Cargando...'}</h3>
        <button className="btn btn-secondary" onClick={() => navigate('/formularios')}>
          Volver
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Expediente</th>
                  <th>Usuario</th>
                  <th>Fecha Envío</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {respuestas.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <p className="empty-text">No hay respuestas para este formulario</p>
                    </td>
                  </tr>
                ) : (
                  respuestas.map(r => (
                    <tr key={r.id}>
                      <td>{r.expediente_titulo || `Expediente #${r.expediente_id}`}</td>
                      <td>{r.usuario_nombre || '-'}</td>
                      <td>{new Date(r.fecha_envio).toLocaleString()}</td>
                      <td>
                        <span className="role-tag">
                          {r.estado || 'Enviado'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-mini"
                          onClick={() => handleVerRespuesta(r)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedRespuesta && formDefinition && (
            <div className="exp-section" style={{ marginTop: '16px' }}>
              <h4>Detalle de Respuesta</h4>
              <div className="formio-renderer-wrapper">
                <FormIORenderer
                  schema={formDefinition.schema}
                  submission={selectedRespuesta.data}
                  readOnly={true}
                />
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedRespuesta(null)}
                style={{ marginTop: '8px' }}
              >
                Cerrar
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

const FormIORenderer = ({ schema, submission, readOnly }) => {
  const [containerId] = useState(() => `formio-renderer-${Math.random().toString(36).slice(2, 9)}`)

  useEffect(() => {
    let formio = null
    let mounted = true

    const initForm = async () => {
      try {
        const mod = await import('formiojs')
        const FormClass = mod.Form || mod.default?.Form
        const FormioClass = mod.Formio || mod.default

        // Suppress Missing projectId warning
        if (FormioClass) {
          FormioClass.setBaseUrl('')
          FormioClass.setProjectUrl('')
        }

        const container = document.getElementById(containerId)
        if (!container || !mounted) return

        const parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema
        const submissionData = submission ? { data: submission } : undefined

        formio = new FormClass(container, parsedSchema, {
          readOnly: readOnly || false,
          submission: submissionData,
          noeval: true
        })
      } catch (err) {
        console.error('Error al inicializar FormIO Renderer:', err)
      }
    }

    initForm()

    return () => {
      mounted = false
      if (formio) {
        formio.destroy()
      }
    }
  }, [containerId, schema, submission, readOnly])

  return <div id={containerId} />
}

export default FormResponses
