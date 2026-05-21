import { useState, useEffect, useRef } from 'react'
import { useApi } from '../../hooks/useApi'
import { formioEsTranslations } from '../../lib/formio-i18n-es'

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

const FormRenderer = ({ formDefinition, expedienteId, onSubmitComplete, readOnly = false }) => {
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

        console.log('[FormRenderer] Initializing with schema:', JSON.stringify(parsedSchema, null, 2))

        // Use Formio.createForm — official API, returns ready instance
        formioRef.current = await Formio.createForm(containerRef.current, parsedSchema, {
          readOnly: readOnly,
          noeval: true,
          language: 'es',
          i18n: {
            es: formioEsTranslations
          }
        })

        // Set initial empty submission
        formioRef.current.submission = { data: {} }
        setInitialized(true)

        formioRef.current.on('submit', async (submission) => {
          if (!mounted || readOnly) return

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
  }, [formDefinition, expedienteId, readOnly, onSubmitComplete, post])

  // Reset initialized state when formDefinition changes
  useEffect(() => {
    setInitialized(false)
  }, [formDefinition?.id])

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
