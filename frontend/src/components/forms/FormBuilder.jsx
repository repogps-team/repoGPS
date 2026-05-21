import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { FormBuilder, Formio } from '@formio/js'
import { formioEsTranslations } from '../../lib/formio-i18n-es'

// Safe schema validator with complete structure
const sanitizeSchema = (schema) => {
  if (!schema || typeof schema !== 'object') {
    return {
      display: 'form',
      components: [],
      title: 'Nuevo Formulario',
      name: 'newForm'
    }
  }
  return {
    display: schema.display || 'form',
    components: Array.isArray(schema.components) ? schema.components : [],
    title: schema.title || 'Formulario',
    name: schema.name || 'form'
  }
}

const FormBuilderPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { get, post, put } = useApi()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [formSchema, setFormSchema] = useState({ display: 'form', components: [] })
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [builderError, setBuilderError] = useState(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  const containerRef = useRef(null)
  const builderRef = useRef(null)

  // Load existing form if editing
  useEffect(() => {
    if (id) {
      const cargarFormulario = async () => {
        setCargando(true)
        try {
          const data = await get(`/api/forms/${id}`)
          setNombre(data.nombre)
          setDescripcion(data.descripcion || '')
          if (data.schema) {
            const parsed = typeof data.schema === 'string' ? JSON.parse(data.schema) : data.schema
            setFormSchema(sanitizeSchema(parsed))
          }
        } catch (err) {
          setError(err.message)
        } finally {
          setCargando(false)
          setDataLoaded(true)
        }
      }
      cargarFormulario()
    } else {
      // New form — data is "loaded" (empty schema is fine)
      setDataLoaded(true)
    }
  }, [id, get])

  // Initialize FormIO Builder imperatively (only after data is loaded)
  useEffect(() => {
    if (!containerRef.current || !dataLoaded) return

    let mounted = true

    // Suppress FormIO warnings
    Formio.setBaseUrl('')
    Formio.setProjectUrl('')

    const initBuilder = () => {
      try {
        // Destroy existing builder if any
        if (builderRef.current) {
          builderRef.current.instance.destroy()
          builderRef.current = null
        }

        // Ensure schema is valid
        const currentSchema = sanitizeSchema(formSchema)
        // Create new builder
        const builderInstance = new FormBuilder(containerRef.current, currentSchema, {
          language: 'es',
          i18n: {
            es: formioEsTranslations
          },
          noeval: true,
          hooks: {
            beforeSubmit: (submission, next) => next(null, submission)
          }
        })

        if (!mounted) return
        builderRef.current = builderInstance

        // Listen for changes
        builderInstance.instance.on('change', () => {
          if (!mounted) return
          try {
            const newSchema = builderInstance.instance.schema
            if (newSchema) {
              setFormSchema(sanitizeSchema(newSchema))
              setBuilderError(null)
            }
          } catch (err) {
            console.error('[FormBuilder] Error processing schema change:', err)
          }
        })
      } catch (err) {
        console.error('[FormBuilder] Initialization error:', err)
        if (mounted) {
          setBuilderError(`Error al inicializar el editor: ${err.message}`)
        }
      }
    }

    // Use setTimeout to ensure DOM is fully ready
    const timerId = setTimeout(initBuilder, 100)

    return () => {
      mounted = false
      clearTimeout(timerId)
      if (builderRef.current) {
        builderRef.current.instance.destroy()
        builderRef.current = null
      }
    }
  }, [id, dataLoaded]) // Re-init when ID or dataLoaded changes

  const handleSave = async (e) => {
    e.preventDefault()
    setMensaje(null)
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!formSchema.components || formSchema.components.length === 0) {
      setError('El formulario debe tener al menos un campo')
      return
    }

    try {
      const body = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        schema: formSchema
      }

      if (id) {
        await put(`/api/forms/${id}`, body)
        setMensaje('Formulario actualizado correctamente')
        setTimeout(() => navigate('/formularios'), 1200)
      } else {
        await post('/api/forms', body)
        setMensaje('Formulario creado correctamente')
        setTimeout(() => navigate('/formularios'), 1200)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  if (cargando) return <div className="loading">Cargando...</div>

  return (
    <section className="panel">
      <div className="panel-top">
        <h3>{id ? 'Editar Formulario' : 'Crear Formulario'}</h3>
        <button className="btn btn-secondary" onClick={() => navigate('/formularios')}>
          Volver
        </button>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSave} className="form-builder-layout">
        {/* Meta fields row */}
        <div className="form-meta-row">
          <div className="field">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              placeholder="Nombre del formulario"
            />
          </div>

          <div className="field">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción opcional"
              rows={2}
            />
          </div>
        </div>

        {/* Full width builder */}
        <div className="form-builder-full">
          <div className="formio-builder-wrapper" key={id || 'new-form'}>
            {builderError ? (
              <div className="alert alert-error" style={{ margin: '20px' }}>
                <p>{builderError}</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setBuilderError(null)
                    if (containerRef.current) {
                      containerRef.current.innerHTML = ''
                    }
                  }}
                  style={{ marginTop: '8px' }}
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div ref={containerRef} />
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {id ? 'Actualizar Formulario' : 'Guardar Formulario'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default FormBuilderPage
