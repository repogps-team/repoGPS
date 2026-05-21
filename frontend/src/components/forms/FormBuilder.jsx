import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'

const FormBuilder = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { get, post, put } = useApi()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [formSchema, setFormSchema] = useState({ display: 'form', components: [] })
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (id) {
      const cargarFormulario = async () => {
        setCargando(true)
        try {
          const data = await get(`/api/forms/${id}`)
          setNombre(data.nombre)
          setDescripcion(data.descripcion || '')
          if (data.schema) {
            setFormSchema(typeof data.schema === 'string' ? JSON.parse(data.schema) : data.schema)
          }
        } catch (err) {
          setError(err.message)
        } finally {
          setCargando(false)
        }
      }
      cargarFormulario()
    }
  }, [id, get])

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
      } else {
        await post('/api/forms', body)
        setMensaje('Formulario creado correctamente')
        setNombre('')
        setDescripcion('')
        setFormSchema({ display: 'form', components: [] })
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
          <div className="formio-builder-wrapper">
            <FormIOBuilderComponent
              schema={formSchema}
              onChange={setFormSchema}
            />
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

const FormIOBuilderComponent = ({ schema, onChange }) => {
  const containerRef = useRef(null)
  const builderRef = useRef(null)
  const schemaRef = useRef(schema)
  const onChangeRef = useRef(onChange)
  const debounceTimer = useRef(null)
  const isUpdatingFromProp = useRef(false)

  // Keep refs in sync
  useEffect(() => { schemaRef.current = schema }, [schema])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    let mounted = true

    const initBuilder = async () => {
      // Wait for next tick to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!containerRef.current || !mounted) return

      try {
        const mod = await import('formiojs')
        const FormBuilderClass = mod.FormBuilder || mod.default?.FormBuilder
        if (!FormBuilderClass) {
          console.error('FormIO FormBuilder not found')
          return
        }

        // Suppress Missing projectId warning
        const FormioClass = mod.Formio || mod.default
        if (FormioClass) {
          FormioClass.setBaseUrl('')
          FormioClass.setProjectUrl('')
        }

        // Ensure schema is valid
        const initialSchema = schemaRef.current || { display: 'form', components: [] }

        const builder = new FormBuilderClass(containerRef.current, initialSchema, {
          noeval: true,
          hooks: {
            beforeSubmit: (submission, next) => next(null, submission)
          }
        })

        builderRef.current = builder

        builder.instance.on('change', () => {
          if (!mounted || isUpdatingFromProp.current) return
          
          const newSchema = builder.instance.schema
          if (!newSchema) return

          // Debounce to prevent infinite loop and excessive state updates
          if (debounceTimer.current) clearTimeout(debounceTimer.current)
          debounceTimer.current = setTimeout(() => {
            if (mounted && onChangeRef.current) {
              onChangeRef.current(newSchema)
            }
          }, 300)
        })
      } catch (err) {
        console.error('Error al inicializar FormIO Builder:', err)
      }
    }

    initBuilder()

    return () => {
      mounted = false
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (builderRef.current && builderRef.current.instance) {
        builderRef.current.instance.destroy()
        builderRef.current = null
      }
    }
  }, [])

  // Update builder when schema changes from parent (e.g., initial load or save)
  useEffect(() => {
    if (!builderRef.current || !builderRef.current.instance) return
    
    // Avoid triggering change event when updating from prop
    isUpdatingFromProp.current = true
    
    builderRef.current.instance.setForm(schema).then(() => {
      isUpdatingFromProp.current = false
    }).catch(() => {
      isUpdatingFromProp.current = false
    })
  }, [schema])

  return <div ref={containerRef} />
}

export default FormBuilder
