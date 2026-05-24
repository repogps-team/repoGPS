import { useState, useEffect, useCallback, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadModal } from '../upload/UploadModal'
import { DocumentTimeline } from '../upload/DocumentTimeline'
import FormRenderer from '../forms/FormRenderer'
import { useApi } from '../../hooks/useApi'

const ExpedienteDetalle = ({
  expediente,
  historial = [],
  documentos = [],
  onCerrar,
  onAvanzar,
  onDevolver,
  onRechazar,
  onActualizarFechaTermino,
  onDocumentoUploaded,
  esAdmin = false
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const navigate = useNavigate()
  const { get } = useApi()

  // Refrescar documentos cuando el sync offline completa
  const handleSyncComplete = useCallback(() => {
    if (onDocumentoUploaded) {
      onDocumentoUploaded()
    }
  }, [onDocumentoUploaded])

  useEffect(() => {
    window.addEventListener('repogps:sync-complete', handleSyncComplete)
    return () => window.removeEventListener('repogps:sync-complete', handleSyncComplete)
  }, [handleSyncComplete])
  const [showNuevaVersionModal, setShowNuevaVersionModal] = useState(false)
  const [documentoParaNuevaVersion, setDocumentoParaNuevaVersion] = useState(null)
  const [expandedDocId, setExpandedDocId] = useState(null)
  const [formulariosAsignados, setFormulariosAsignados] = useState([])
  const [expandedFormId, setExpandedFormId] = useState(null)
  const [expandedFormDetail, setExpandedFormDetail] = useState(null) // schema + respuestas completas
  const [viewingResponse, setViewingResponse] = useState(null)
  const [transicionesDisponibles, setTransicionesDisponibles] = useState([])
  const [etapasProceso, setEtapasProceso] = useState([])

  const handleAvanzar = async () => {
    const observacion = prompt('Observación (opcional):')
    if (observacion !== null) {
      try {
        await onAvanzar(expediente.id, observacion)
        onCerrar()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  const handleDevolver = async () => {
    const observacion = prompt('Observación (opcional):')
    if (observacion !== null) {
      try {
        await onDevolver(expediente.id, observacion)
        onCerrar()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  const handleRechazar = async () => {
    if (!window.confirm('¿Estás seguro de rechazar este expediente? Esta acción no se puede deshacer.')) return
    const observacion = prompt('Motivo del rechazo (opcional):')
    if (observacion !== null) {
      try {
        await onRechazar(expediente.id, observacion)
        onCerrar()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  useEffect(() => {
    if (expediente?.id) {
      const cargarFormularios = async () => {
        try {
          const data = await get(`/api/forms/expediente/${expediente.id}`)
          if (Array.isArray(data)) {
            setFormulariosAsignados(data)
          }
        } catch (err) {
          console.error('Error al cargar formularios:', err)
        }
      }
      cargarFormularios()

      // HU-21: Cargar transiciones disponibles para el rol del usuario
      const cargarTransiciones = async () => {
        try {
          const data = await get(`/api/transiciones/available?expediente_id=${expediente.id}`)
          if (Array.isArray(data)) {
            setTransicionesDisponibles(data)
          }
        } catch (err) {
          console.error('Error al cargar transiciones disponibles:', err)
        }
      }
      cargarTransiciones()

      // HU-12: Cargar etapas del proceso para el timeline
      if (expediente.proceso_id) {
        const cargarEtapas = async () => {
          try {
            const data = await get(`/api/etapas-proceso/proceso/${expediente.proceso_id}`)
            if (Array.isArray(data)) {
              setEtapasProceso(data)
            }
          } catch (err) {
            console.error('Error al cargar etapas del proceso:', err)
          }
        }
        cargarEtapas()
      }
    }
  }, [expediente?.id, get])

  const handleExpandForm = async (form) => {
    if (expandedFormId === form.id) {
      setExpandedFormId(null)
      setExpandedFormDetail(null)
      setViewingResponse(null)
      return
    }
    setExpandedFormId(form.id)
    setViewingResponse(null)
    // Fetch full form definition (with schema) and responses
    try {
      const [formDef, responses] = await Promise.all([
        get(`/api/forms/${form.id}`),
        get(`/api/forms/${form.id}/respuestas`)
      ])
      const filteredResponses = Array.isArray(responses)
        ? responses.filter(r => Number(r.expediente_id) === Number(expediente.id))
        : []
      setExpandedFormDetail({ schema: formDef?.schema, respuestas: filteredResponses })
    } catch (err) {
      console.error('Error al cargar detalle del formulario:', err)
      setExpandedFormDetail({ schema: null, respuestas: [] })
    }
  }

  const handleStartRespond = (form) => {
    navigate(`/expedientes/${expediente.id}/responder/${form.id}`)
  }

  // HU-12: Determinar estado de cada etapa para el timeline
  const getEtapaStatus = (etapa) => {
    if (!expediente?.etapa_actual_id || etapasProceso.length === 0) return 'pending'
    const etapaActual = etapasProceso.find(e => e.id === expediente.etapa_actual_id)
    if (!etapaActual) return 'pending'
    // Si la etapa actual es "Rechazado", mostrar como rechazado
    if (etapaActual.nombre?.toLowerCase() === 'rechazado') {
      if (etapa.id === expediente.etapa_actual_id) return 'rejected'
      if (etapa.orden < etapaActual.orden) return 'completed'
      return 'skipped'
    }
    if (etapa.orden < etapaActual.orden) return 'completed'
    if (etapa.id === expediente.etapa_actual_id) return 'current'
    return 'pending'
  }

  const statusIcon = {
    completed: 'check_circle',
    current: 'radio_button_checked',
    rejected: 'cancel',
    skipped: 'radio_button_unchecked',
    pending: 'radio_button_unchecked'
  }

  if (!expediente) return null

  const handleFechaTerminoChange = async (e) => {
    const nuevaFecha = e.target.value
    if (!onActualizarFechaTermino) return
    try {
      await onActualizarFechaTermino(expediente.id, nuevaFecha || null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUploadComplete = (newDoc) => {
    if (onDocumentoUploaded) {
      onDocumentoUploaded(newDoc)
    }
  }

  const handleDownloadDocumento = async (doc) => {
    if (doc.ruta_garage) {
      // Use the download endpoint
      const token = localStorage.getItem('token')
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/api/documentos/${doc.id}/descargar`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )
        if (!response.ok) throw new Error('Error al descargar')

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', doc.nombre_archivo)
        document.body.appendChild(link)
        link.click()
        link.parentNode.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch {
        alert('Error al descargar el documento')
      }
    }
  }

  const handleNuevaVersion = (doc) => {
    setDocumentoParaNuevaVersion(doc)
    setShowNuevaVersionModal(true)
  }

  const handleNuevaVersionComplete = (newVersionDoc) => {
    if (onDocumentoUploaded) {
      onDocumentoUploaded(newVersionDoc)
    }
    setShowNuevaVersionModal(false)
    setDocumentoParaNuevaVersion(null)
  }

  return (
    <>
      {/* Expediente Detail Modal */}
      <div className="modal-overlay" onClick={onCerrar}>
        <div className="modal-content modal-content--expediente" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Expediente #{expediente.id}</h2>
            <button className="btn-close" onClick={onCerrar}>×</button>
          </div>

          <div className="modal-body">
            <div className="exp-info">
              <p><strong>Título:</strong> {expediente.titulo}</p>
              <p><strong>Proceso:</strong> {expediente.proceso_nombre}</p>
              <p><strong>Etapa Actual:</strong> <span className="role-tag">{expediente.etapa_actual}</span></p>
              <p><strong>Descripción:</strong> {expediente.descripcion || 'Sin descripción'}</p>
              <p><strong>Fecha Creación:</strong> {new Date(expediente.fecha_creacion).toLocaleString()}</p>
              <p><strong>Fecha de término:</strong> {expediente.fecha_termino ? new Date(expediente.fecha_termino).toLocaleDateString() : '-'}</p>
              {esAdmin && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                    Editar fecha de término
                  </label>
                  <input
                    type="date"
                    value={expediente.fecha_termino ? new Date(expediente.fecha_termino).toISOString().slice(0, 10) : ''}
                    onChange={handleFechaTerminoChange}
                  />
                </div>
              )}
            </div>

            {/* HU-12: Timeline de etapas del proceso */}
            {etapasProceso.length > 0 && (
              <div className="exp-section">
                <h4>Progreso del Proceso</h4>
                <div className="timeline">
                  {etapasProceso.map((etapa, index) => {
                    const status = getEtapaStatus(etapa)
                    return (
                      <Fragment key={etapa.id}>
                        <div className={`timeline-step ${status}`}>
                          <div className="timeline-icon-row">
                            <span className="material-icons">{statusIcon[status]}</span>
                            {index < etapasProceso.length - 1 && (
                              <span className={`timeline-connector timeline-connector--${status === 'completed' ? 'completed' : 'pending'}`} />
                            )}
                          </div>
                          <div className="timeline-label">{etapa.nombre}</div>
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="exp-actions">
              {transicionesDisponibles.length > 0 || esAdmin ? (
                <>
                  <button className="btn btn-primary" onClick={handleAvanzar}>Avanzar</button>
                  <button className="btn btn-secondary" onClick={handleDevolver}>Devolver</button>
                  <button className="btn btn-danger" onClick={handleRechazar}>Rechazar</button>
                </>
              ) : (
                <span className="muted" style={{ fontSize: '0.85rem', padding: '8px 0', display: 'inline-block' }}>
                  No tienes permisos para avanzar este expediente
                </span>
              )}
              <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>Adjuntar archivo</button>
            </div>

            <div className="exp-section">
              <h4>Historial</h4>
              {historial.length > 0 ? (
                <table className="users-table">
                  <thead><tr><th>Fecha</th><th>De</th><th>A</th><th>Usuario</th><th>Observación</th></tr></thead>
                  <tbody>
                    {historial.map(h => (
                      <tr key={h.id}>
                        <td>{new Date(h.fecha_cambio).toLocaleString()}</td>
                        <td>{h.etapa_anterior_nombre || '-'}</td>
                        <td>{h.etapa_nueva_nombre || '-'}</td>
                        <td>{h.usuario_nombre || '-'}</td>
                        <td>{h.observacion || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="empty-text">Sin cambios de etapa registrados</p>}
            </div>

            <div className="exp-section">
              <h4>Documentos</h4>
              {documentos.length > 0 ? (
                <table className="users-table">
                  <thead><tr><th>Nombre</th><th>Tipo</th><th>Tamaño</th><th>Versión</th><th>Fecha</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {documentos.map(d => (
                      <>
                        <tr key={d.id}>
                          <td>
                            <button
                              className="doc-name-toggle"
                              onClick={() => setExpandedDocId(expandedDocId === d.id ? null : d.id)}
                              title={expandedDocId === d.id ? 'Ocultar versiones' : 'Ver versiones'}
                            >
                              <span className="toggle-icon">{expandedDocId === d.id ? '▼' : '▶'}</span>
                              {d.nombre_archivo}
                            </button>
                          </td>
                          <td>{d.tipo_mime}</td>
                          <td>{(d.tamano_bytes / 1024).toFixed(1)} KB</td>
                          <td>v{d.version || 1}</td>
                          <td>{new Date(d.fecha_upload).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="btn btn-small"
                              onClick={() => handleDownloadDocumento(d)}
                              title="Descargar"
                            >
                              📥
                            </button>
                            <button
                              className="btn btn-small btn-primary"
                              onClick={() => handleNuevaVersion(d)}
                              title="Nueva versión"
                              style={{ marginLeft: '4px' }}
                            >
                              ➕
                            </button>
                          </td>
                        </tr>
                        {expandedDocId === d.id && (
                          <tr key={`${d.id}-timeline`}>
                            <td colSpan={6}>
                              <DocumentTimeline documentoId={d.id} documento={d} />
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              ) : <p className="empty-text">Sin documentos adjuntos</p>}
            </div>

            <div className="exp-section">
              <h4>Formularios Asignados</h4>
              {formulariosAsignados.length > 0 ? (
                <>
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Nombre del Formulario</th>
                        <th>Respuestas</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formulariosAsignados.map(f => (
                        <>
                          <tr key={f.id}>
                            <td>
                              <button
                                className="doc-name-toggle"
                                onClick={() => handleExpandForm(f)}
                                title={expandedFormId === f.id ? 'Ocultar respuestas' : 'Ver respuestas'}
                              >
                                <span className="toggle-icon">{expandedFormId === f.id ? '▼' : '▶'}</span>
                                {f.nombre}
                              </button>
                            </td>
                            <td>{f.respuestas_count || 0}</td>
                            <td>
                              {f.puede_responder ? (
                                <button
                                  className="btn-mini btn-edit"
                                  onClick={() => handleStartRespond(f)}
                                >
                                  Responder
                                </button>
                              ) : (
                                <span className="role-tag">Solo lectura</span>
                              )}
                            </td>
                          </tr>
                          {expandedFormId === f.id && expandedFormDetail && (
                            <tr key={`${f.id}-responses`}>
                              <td colSpan={3}>
                                <div style={{ padding: '8px 0' }}>
                                  {expandedFormDetail.respuestas && expandedFormDetail.respuestas.length > 0 ? (
                                    expandedFormDetail.respuestas.map(r => (
                                      <div key={r.id} style={{ marginBottom: '8px', padding: '8px', background: 'var(--bg-secondary, #f5f5f5)', borderRadius: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #666)' }}>
                                            {r.usuario_nombre || '-'} — {new Date(r.fecha_envio).toLocaleString()}
                                          </span>
                                          <button
                                            className="btn-mini"
                                            onClick={() => setViewingResponse(viewingResponse?.id === r.id ? null : r)}
                                          >
                                            {viewingResponse?.id === r.id ? 'Ocultar' : 'Ver'}
                                          </button>
                                        </div>
                                        {viewingResponse?.id === r.id && expandedFormDetail.schema && (
                                          <div className="formio-renderer-wrapper">
                                            <FormRenderer
                                              formDefinition={{ id: f.id, schema: expandedFormDetail.schema }}
                                              submissionData={r.data}
                                              readOnly={true}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="empty-text">Sin respuestas aún</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : <p className="empty-text">Sin formularios asignados</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal for new documents - rendered as separate overlay */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          expedienteId={expediente?.id}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Upload Modal for new version of existing document - rendered as separate overlay */}
      {showNuevaVersionModal && (
        <UploadModal
          isOpen={showNuevaVersionModal}
          onClose={() => {
            setShowNuevaVersionModal(false)
            setDocumentoParaNuevaVersion(null)
          }}
          documentoId={documentoParaNuevaVersion?.id}
          onUploadComplete={handleNuevaVersionComplete}
        />
      )}
    </>
  )
}

export default ExpedienteDetalle
