import { useState, useEffect, useRef } from 'react'
import { useApi } from '../../hooks/useApi'
import { formioEsTranslations } from '../../lib/formio-i18n-es'
import { enqueue } from '../../lib/offlineQueue'

// Safe schema parser — handles string, object, or null
const parseSchema = (schema) => {
  if (!schema) return null
  if (typeof schema === 'string') {
    try {
      return JSON.parse(schema)
    } catch {
      return null
    }
  }
  if (typeof schema === 'object') return schema
  return null
}

const FormRenderer = ({ formDefinition, expedienteId, onSubmitComplete, readOnly = false, submissionData = null }) => {
  const { post } = useApi()
  const containerRef = useRef(null)
  const formioRef = useRef(null)

  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    if (!formDefinition?.schema) {
      setInitialized(false)
      return
    }

    const parsedSchema = parseSchema(formDefinition.schema)
    if (!parsedSchema || !parsedSchema.components) {
      setError('El formulario no tiene campos configurados')
      setInitialized(false)
      return
    }

    // Prevent re-initialization with same schema
    if (initialized && formioRef.current) return

    let mounted = true

    const initForm = async () => {
      try {
        const { Formio } = await import('@formio/js')

        // Suppress Missing projectId warning
        Formio.setBaseUrl('')
        Formio.setProjectUrl('')

        if (formioRef.current) {
          formioRef.current.destroy()
          formioRef.current = null
        }

        // Use Formio.createForm — official API, returns ready instance
        formioRef.current = await Formio.createForm(containerRef.current, parsedSchema, {
          readOnly: readOnly,
          noeval: true,
          language: 'es',
          i18n: {
            es: formioEsTranslations
          }
        })

        // Set submission data (empty for new form, or existing data for viewing)
        formioRef.current.submission = {
          data: submissionData || {}
        }
        setInitialized(true)

        formioRef.current.on('submit', async (submission) => {
          if (!mounted || readOnly) return

          // Offline: enqueue instead of posting
          if (!navigator.onLine) {
            try {
              await enqueue({
                type: 'form',
                expediente_id: expedienteId,
                url: `/api/forms/${formDefinition.id}/responder`,
                method: 'POST',
                body: { expediente_id: expedienteId, data: submission.data }
              })
              setMensaje('Formulario guardado sin conexión. Se sincronizará automáticamente cuando haya conexión.')
              if (onSubmitComplete) {
                onSubmitComplete()
              }
            } catch (err) {
              setError('Error al guardar el formulario sin conexión: ' + err.message)
            }
            return
          }

          setLoading(true)
          setError(null)
          setMensaje(null)

          try {
            await post(`/api/forms/${formDefinition.id}/responder`, {
              expediente_id: expedienteId,
              data: submission.data
            })
            setMensaje('Formulario enviado correctamente')
            if (onSubmitComplete) {
              onSubmitComplete()
            }
          } catch (err) {
            setError(err.message)
          } finally {
            setLoading(false)
          }
        })
      } catch (err) {
        console.error('Error al inicializar FormIO Renderer:', err)
        setError('Error al cargar el formulario')
        setInitialized(false)
      }
    }

    initForm()

    return () => {
      mounted = false
      if (formioRef.current) {
        formioRef.current.destroy()
        formioRef.current = null
      }
    }
  }, [formDefinition, expedienteId, readOnly, onSubmitComplete, post, submissionData])

  // Reset initialized state when formDefinition or submissionData changes
  useEffect(() => {
    setInitialized(false)
  }, [formDefinition?.id, submissionData])

  if (!formDefinition?.schema) {
    return <div className="loading">Cargando formulario...</div>
  }

  const parsedSchema = parseSchema(formDefinition.schema)
  if (!parsedSchema || !parsedSchema.components || parsedSchema.components.length === 0) {
    return <div className="loading">El formulario no tiene campos configurados</div>
  }

  return (
    <div className="form-renderer">
      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div ref={containerRef} className="formio-renderer-wrapper" />

      {!readOnly && (
        <div className="form-actions" style={{ marginTop: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (formioRef.current) {
                formioRef.current.submit()
              }
            }}
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar Formulario'}
          </button>
        </div>
      )}
    </div>
  )
}

export default FormRenderer
