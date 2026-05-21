import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'

const API_URL = import.meta.env.VITE_API_URL || ''

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

      <form onSubmit={handleSave} className="form-grid">
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
            rows={3}
          />
        </div>

        <div className="field field--full">
          <label>Diseño del Formulario</label>
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
  const [builderRef, setBuilderRef] = useState(null)
  const onChangeRef = onChange
  const schemaRef = schema

  useEffect(() => {
    let builder = null
    let mounted = true

    const initBuilder = async () => {
      try {
        const mod = await import('formiojs')
        const Formio = mod.default || mod.Formio
        const container = document.getElementById('formio-builder')
        if (!container || !mounted) return

        builder = new Formio.Builder(container, schemaRef, {})

        builder.instance.on('change', () => {
          if (mounted && builder.instance.schema) {
            onChangeRef(builder.instance.schema)
          }
        })

        setBuilderRef(builder)
      } catch (err) {
        console.error('Error al inicializar FormIO Builder:', err)
      }
    }

    initBuilder()

    return () => {
      mounted = false
      if (builder && builder.instance) {
        builder.instance.destroy()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (builderRef && builderRef.instance) {
      builderRef.instance.form = schema
    }
  }, [schema, builderRef])

  return <div id="formio-builder" />
}

export default FormBuilder
