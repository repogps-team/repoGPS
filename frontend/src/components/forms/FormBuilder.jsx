import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { FormBuilder } from '@formio/react'

// Safe wrapper to ensure schema is always valid
const sanitizeSchema = (schema) => {
  if (!schema) return { display: 'form', components: [] }
  return {
    display: schema.display || 'form',
    components: Array.isArray(schema.components) ? schema.components : []
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
        }
      }
      cargarFormulario()
    }
  }, [id, get])

  const handleSchemaChange = (newSchema) => {
    try {
      setBuilderError(null)
      setFormSchema(sanitizeSchema(newSchema))
    } catch (err) {
      console.error('Error processing schema change:', err)
      setBuilderError('Error al actualizar el diseño del formulario')
    }
  }

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
            {builderError ? (
              <div className="alert alert-error" style={{ margin: '20px' }}>
                <p>{builderError}</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => setBuilderError(null)}
                  style={{ marginTop: '8px' }}
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <FormBuilder
                key={id || 'new-form'}
                form={sanitizeSchema(formSchema)}
                onChange={handleSchemaChange}
                options={{
                  noeval: true,
                  hooks: {
                    beforeSubmit: (submission, next) => next(null, submission)
                  }
                }}
              />
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
