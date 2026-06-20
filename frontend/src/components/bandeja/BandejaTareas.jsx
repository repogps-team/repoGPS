import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useTareas } from '../../hooks/useTareas'

const BadgeTipo = ({ tipo }) => {
  const estilos = {
    revision: { bg: 'var(--info-bg, #dbeafe)', color: 'var(--info-text, #1d4ed8)' },
    aprobacion: { bg: 'var(--success-bg, #dcfce7)', color: 'var(--success-text, #166534)' },
    visacion: { bg: 'var(--warning-bg, #fef3c7)', color: 'var(--warning-text, #92400e)' },
    subsanacion: { bg: '#fef3c7', color: '#92400e' }
  }
  const estilo = estilos[tipo] || { bg: 'var(--surface-hover, #f1f5f9)', color: 'var(--text-muted, #475569)' }

  const labels = {
    revision: 'Revision',
    aprobacion: 'Aprobacion',
    visacion: 'Visacion',
    subsanacion: 'Subsanacion'
  }

  return (
    <span style={{
      background: estilo.bg,
      color: estilo.color,
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500
    }}>
      {labels[tipo] || tipo}
    </span>
  )
}

const BandejaTareas = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { tareas, loading, error, cargarTareas, marcarVisto, actualizarTarea } = useTareas()
  const [observacion, setObservacion] = useState('')
  const [tareaExpandida, setTareaExpandida] = useState(null)
  const [mostrarFormObs, setMostrarFormObs] = useState(null)
  const [accionObservacion, setAccionObservacion] = useState(null) // 'rechazada' | 'subsanacion'
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') || 'todas')

  const tareasFiltradas = filtroEstado === 'todas'
    ? tareas
    : tareas.filter(t => t.estado === filtroEstado)

  useEffect(() => {
    if (user?.id && user?.area_id && user?.rol_id) {
      cargarTareas(user.id, user.area_id, user.rol_id)
    }
  }, [user, cargarTareas])

  const handleVerDetalle = async (tarea) => {
    setTareaExpandida(tarea.id)
    setMostrarFormObs(null)
    setAccionObservacion(null)
    setObservacion('')
    // Solo marcar como visto si está pendiente (no si ya está en subsanación, rechazada o completada)
    if (tarea.estado === 'pendiente') {
      await marcarVisto(tarea.id)
    }
  }

  const handleAccion = async (tareaId, estado) => {
    try {
      if (['rechazada', 'subsanacion'].includes(estado) && !observacion.trim()) {
        alert('Para rechazar o subsanar debes ingresar una observación')
        return
      }
      await actualizarTarea(tareaId, estado, observacion || null)
      setTareaExpandida(null)
      setObservacion('')
      setMostrarFormObs(null)
      setAccionObservacion(null)
    } catch (err) {
      alert('Error al procesar tarea: ' + err.message)
    }
  }

  const handleAbrirObs = (tareaId, accion) => {
    setMostrarFormObs(tareaId)
    setAccionObservacion(accion)
    setObservacion('')
  }

  if (loading) {
    return (
      <div className="bandeja-tareas">
        <h2 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>
          Bandeja de Tareas
        </h2>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Cargando tareas...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bandeja-tareas">
        <h2 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>
          Bandeja de Tareas
        </h2>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--danger-color)' }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="bandeja-tareas">
      <h2 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>
        Bandeja de Tareas
        <span style={{
          background: 'var(--danger-color)',
          color: 'var(--text-inverse)',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '14px',
          marginLeft: '12px'
        }}>
          {tareas.length}
        </span>
      </h2>

      {/* Filtros por estado */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'todas', label: 'Todas' },
          { key: 'pendiente', label: 'Nuevas' },
          { key: 'visto', label: 'Vistas' },
          { key: 'subsanacion', label: 'Subsanacion' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: `1px solid ${filtroEstado === f.key ? 'var(--primary-color)' : 'var(--border-color)'}`,
              background: filtroEstado === f.key ? 'var(--primary-color)' : 'transparent',
              color: filtroEstado === f.key ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {tareasFiltradas.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>
            {filtroEstado === 'todas' ? 'No hay tareas pendientes' : `No hay tareas con estado "${filtroEstado}"`}
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Las tareas que requieran tu atencion apareceran aqui
          </p>
        </div>
      ) : (
        <div className="tareas-lista">
          {tareasFiltradas.map(tarea => (
            <div 
              key={tarea.id} 
              className={`tarea-card ${tareaExpandida === tarea.id ? 'expandida' : ''}`}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                marginBottom: '12px',
                overflow: 'hidden',
                transition: 'all 0.2s'
              }}
            >
              <div 
                style={{ padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => handleVerDetalle(tarea)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BadgeTipo tipo={tarea.tipo_tarea} />
                    <span style={{ 
                      color: tarea.estado === 'visto' ? 'var(--text-secondary)' : 'var(--text-main)',
                      fontWeight: tarea.estado === 'pendiente' ? 600 : 400
                    }}>
                      {tarea.estado === 'pendiente' ? 'Nueva' : 'Vista'}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(tarea.fecha_asignacion).toLocaleDateString('es-CL')}
                  </span>
                </div>
                
                <h4 style={{ 
                  color: 'var(--text-main)', 
                  marginBottom: '8px',
                  fontSize: '15px'
                }}>
                  {tarea.expediente_titulo}
                </h4>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  color: 'var(--text-secondary)', 
                  fontSize: '13px' 
                }}>
                  <span>{tarea.proceso_nombre}</span>
                  <span>Etapa: {tarea.etapa_nombre}</span>
                </div>
              </div>

              {tareaExpandida === tarea.id && (
                <div style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--border-color)',
                  background: 'var(--bg-app)'
                }}>
                  {mostrarFormObs === tarea.id ? (
                    <div>
                      <textarea
                        placeholder="Agregar observacion (requerida para rechazar/subsanar)"
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          marginBottom: '12px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => { setMostrarFormObs(null); setAccionObservacion(null) }}
                        >
                          Cancelar
                        </button>
                        {accionObservacion === 'subsanacion' ? (
                          <button 
                            className="btn btn-warning"
                            onClick={() => handleAccion(tarea.id, 'subsanacion')}
                            style={{ background: '#f59e0b', color: 'white' }}
                          >
                            Subsanar
                          </button>
                        ) : (
                          <button 
                            className="btn btn-danger"
                            onClick={() => handleAccion(tarea.id, 'rechazada')}
                          >
                            Rechazar
                          </button>
                        )}
                        <button 
                          className="btn btn-primary"
                          onClick={() => handleAccion(tarea.id, 'completada')}
                          style={{ background: 'var(--success-color)' }}
                        >
                          Aprobar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => navigate(`/expedientes?abrir=${tarea.expediente_id}`)}
                      >
                        Ver Expediente
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => setTareaExpandida(null)}
                      >
                        Cerrar
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleAbrirObs(tarea.id, 'rechazada')}
                      >
                        Rechazar
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleAbrirObs(tarea.id, 'subsanacion')}
                        style={{ background: '#f59e0b', color: 'white', borderColor: '#f59e0b' }}
                      >
                        Subsanar
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleAccion(tarea.id, 'completada')}
                        style={{ background: '#22c55e' }}
                      >
                        Aprobar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BandejaTareas
