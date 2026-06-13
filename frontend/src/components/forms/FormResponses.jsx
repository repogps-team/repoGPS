import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import DataTable from '../shared/DataTable'

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

  const columns = useMemo(() => [
    {
      accessorKey: 'expediente_titulo',
      header: 'Expediente',
      cell: (info) => info.getValue() || `Expediente #${info.row.original.expediente_id}`,
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'usuario_nombre',
      header: 'Usuario',
      cell: (info) => info.getValue() || '-',
      meta: { priority: 'medium' }
    },
    {
      accessorKey: 'fecha_envio',
      header: 'Fecha Envío',
      cell: (info) => new Date(info.getValue()).toLocaleString(),
      meta: { priority: 'medium' }
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: (info) => (
        <span className="role-tag">
          {info.getValue() || 'Enviado'}
        </span>
      ),
      meta: { priority: 'high' }
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: (info) => (
        <button className="btn-mini" onClick={() => setSelectedRespuesta(info.row.original)}>Ver</button>
      ),
      meta: { priority: 'high' }
    }
  ], [])

  return (
    <section className="panel">
      <div className="panel-top">
        <h3>Respuestas - {formDefinition?.nombre || 'Cargando...'}</h3>
        <button className="btn btn-secondary" onClick={() => navigate('/formularios')}>
          Volver
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        data={respuestas}
        columns={columns}
        config={{
          loading,
          searchable: true,
          searchPlaceholder: 'Buscar respuesta...',
          sortable: true,
          pagination: true,
          pageSize: 10,
          emptyMessage: 'No hay respuestas para este formulario'
        }}
      />

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
        const mod = await import('@formio/js')
        const FormClass = mod.Form || mod.default?.Form
        const FormioClass = mod.Formio || mod.default

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
