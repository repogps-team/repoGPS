import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpedientes } from '../../hooks/useExpedientes'

const Dashboard = ({ user, esAdmin = true }) => {
  const navigate = useNavigate()
  const { expedientes, cargarExpedientes } = useExpedientes()

  useEffect(() => {
    cargarExpedientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ahora = new Date()

  // Filtrar expedientes según rol
  const expedientesFiltrados = esAdmin
    ? expedientes
    : expedientes.filter(exp => exp.area_id === user?.area_id)

  const stats = {
    total: expedientesFiltrados.length,
    pendiente: 0,
    enPlazo: 0,
    atrasado: 0,
    terminado: 0
  }

  // Usar el campo 'estado' del backend: Pendiente, En Desarrollo, Terminado
  expedientesFiltrados.forEach(exp => {
    const fechaExp = exp.fecha_actualizacion || exp.fecha_creacion
    const diasTranscurridos = Math.floor((ahora - new Date(fechaExp)) / (1000 * 60 * 60 * 24))

    if (exp.estado === 'Terminado') {
      stats.terminado++
    } else if (exp.estado === 'En Desarrollo') {
      // Atrasado: más de 10 días en revisión
      if (diasTranscurridos > 10) {
        stats.atrasado++
      } else {
        stats.enPlazo++
      }
    } else {
      // Pendiente o sin asignar
      stats.pendiente++
    }
  })

  const handleClick = (estado, sla = 'todos') => {
    // Navegar a expedientes y pasar los filtros como query params
    const params = new URLSearchParams()
    if (estado !== 'todos') params.set('estado', estado)
    if (sla !== 'todos') params.set('sla', sla)
    navigate(`/expedientes?${params.toString()}`)
  }

  const enRevisionTotal = stats.enPlazo + stats.atrasado

  const areaLabel = user?.area_nombre || (user?.area_id ? `Área ${user.area_id}` : 'Mi Área')
  const heading = esAdmin
    ? 'Panel de Control'
    : `Panel de Control de Mi Área: ${areaLabel}`

  return (
    <div className="dashboard">
      <h2 style={{ marginBottom: '24px', color: 'var(--text-main)' }}>
        {heading}
      </h2>

      <div className="dashboard-grid">
        <button type="button" className="dashboard-card" style={{ borderLeftColor: 'var(--text-muted)' }} onClick={() => handleClick('todos')}>
          <div className="dashboard-value" style={{ color: 'var(--text-muted)' }}>{stats.total}</div>
          <div className="dashboard-label">Total</div>
        </button>
        <button type="button" className="dashboard-card" style={{ borderLeftColor: 'var(--secondary-color)' }} onClick={() => handleClick('Pendiente')}>
          <div className="dashboard-value" style={{ color: 'var(--secondary-color)' }}>{stats.pendiente}</div>
          <div className="dashboard-label">Pendiente</div>
        </button>
        <div className="dashboard-card" style={{ borderLeftColor: 'var(--primary-color)' }}>
          <button type="button" className="dashboard-card-inner" onClick={() => handleClick('En Desarrollo', 'todos')}>
            <div className="dashboard-value" style={{ color: 'var(--primary-color)' }}>{enRevisionTotal}</div>
            <div className="dashboard-label">En Desarrollo</div>
          </button>
            <div className="dashboard-substats">
              <button type="button" className="dashboard-chip chip-ok" onClick={() => handleClick('En Desarrollo', 'en_plazo')}>
                En plazo: {stats.enPlazo}
              </button>
              <button type="button" className="dashboard-chip chip-warn" onClick={() => handleClick('En Desarrollo', 'atrasado')}>
                Atrasado: {stats.atrasado}
              </button>
            </div>
        </div>
        <button type="button" className="dashboard-card" style={{ borderLeftColor: 'var(--success-color)' }} onClick={() => handleClick('Terminado')}>
          <div className="dashboard-value" style={{ color: 'var(--success-color)' }}>{stats.terminado}</div>
          <div className="dashboard-label">Terminado</div>
        </button>
      </div>
    </div>
  )
}

export default Dashboard