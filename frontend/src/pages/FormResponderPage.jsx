import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FormRenderer from '../components/forms/FormRenderer'
import { useApi } from '../hooks/useApi'

const FormResponderPage = () => {
  const { expedienteId, formId } = useParams()
  const navigate = useNavigate()
  const { get } = useApi()

  const [formDef, setFormDef] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const loadForm = async () => {
      try {
        const data = await get(`/api/forms/${formId}`)
        setFormDef({ id: data.id, nombre: data.nombre, schema: data.schema })
      } catch (err) {
        console.error('Error al cargar formulario:', err)
        setError('Error al cargar el formulario')
      } finally {
        setLoading(false)
      }
    }
    loadForm()
  }, [formId, get])

  const handleSubmitComplete = () => {
    setSubmitted(true)
    // Pequeño delay para que el usuario vea el mensaje de éxito
    setTimeout(() => {
      navigate(`/expedientes`)
    }, 2000)
  }

  const handleVolver = () => {
    navigate(`/expedientes`)
  }

  if (loading) {
    return (
      <div className="form-responder-page">
        <div className="loading">Cargando formulario...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="form-responder-page">
        <div className="form-responder-header">
          <button className="btn btn-secondary" onClick={handleVolver}>
            ← Volver a expedientes
          </button>
        </div>
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  if (!formDef) return null

  return (
    <div className="form-responder-page">
      <div className="form-responder-header">
        <button className="btn btn-secondary" onClick={handleVolver}>
          ← Volver a expedientes
        </button>
        {submitted && (
          <span className="form-responder-success">
            Formulario enviado correctamente — redirigiendo...
          </span>
        )}
      </div>

      <div className="form-responder-content">
        <h2 className="form-responder-title">{formDef.nombre}</h2>
        <FormRenderer
          formDefinition={formDef}
          expedienteId={parseInt(expedienteId)}
          onSubmitComplete={handleSubmitComplete}
        />
      </div>
    </div>
  )
}

export default FormResponderPage
