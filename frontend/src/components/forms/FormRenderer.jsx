import { useState, useEffect, useRef } from 'react'
import { useApi } from '../../hooks/useApi'

const FormRenderer = ({ formDefinition, expedienteId, onSubmitComplete, readOnly = false }) => {
  const { post } = useApi()
  const containerRef = useRef(null)
  const formioRef = useRef(null)

  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !formDefinition?.schema) return

    let mounted = true

    const initForm = async () => {
      try {
        const { Formio } = await import('formiojs')

        if (formioRef.current) {
          formioRef.current.destroy()
          formioRef.current = null
        }

        const parsedSchema = typeof formDefinition.schema === 'string'
          ? JSON.parse(formDefinition.schema)
          : formDefinition.schema

        formioRef.current = new Formio.Form(containerRef.current, parsedSchema, {
          readOnly: readOnly
        })

        formioRef.current.ready.then(() => {
          if (!mounted) return
          formioRef.current.submission = { data: {} }
        })

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

  if (!formDefinition?.schema) {
    return <div className="loading">Cargando formulario...</div>
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
