import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useAreas } from '../hooks/useAreas'
import { useProcesos } from '../hooks/useProcesos'

// UIDs de dashboards de Grafana (configurar después de crearlos en Grafana)
const DASHBOARD_UIDS = {
  general: 'expedientes-general',
  productividad: 'expedientes-productividad',
  documentos: 'expedientes-documentos',
  trazabilidad: 'expedientes-trazabilidad',
}

const TABS = [
  { id: 'general', label: 'Dashboard General' },
  { id: 'productividad', label: 'Productividad' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'trazabilidad', label: 'Trazabilidad' },
]

export default function Reportes() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [iframeSrc, setIframeSrc] = useState('')

  // Filtros
  const [areaId, setAreaId] = useState('')
  const [contratistaId, setContratistaId] = useState('')
  const [procesoId, setProcesoId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Cargar datos para filtros
  const { areas, contratistas, cargarAreas, cargarContratistas } = useAreas()
  const { procesos, cargarProcesos } = useProcesos()

  useEffect(() => {
    cargarAreas()
    cargarContratistas()
    cargarProcesos()
  }, [])

  // Construir URL del iframe con filtros como variables de Grafana
  const buildIframeSrc = useCallback(() => {
    const uid = DASHBOARD_UIDS[activeTab]
    const params = new URLSearchParams({
      orgId: '1',
      kiosk: 'tv',
      refresh: '30s',
    })

    // Variables de Grafana (prefijo var-)
    if (areaId) params.set('var-area', areaId)
    if (contratistaId) params.set('var-contratista', contratistaId)
    if (procesoId) params.set('var-proceso', procesoId)
    if (fechaDesde) params.set('var-fecha_desde', fechaDesde)
    if (fechaHasta) params.set('var-fecha_hasta', fechaHasta)

    // hide Grafana variable UI
    return `/grafana/d/${uid}?${params.toString()}&var-hide=1`
  }, [activeTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta])

  // Actualizar iframe cuando cambian filtros o tab
  useEffect(() => {
    setIframeSrc(buildIframeSrc())
  }, [buildIframeSrc])

  const clearFilters = () => {
    setAreaId('')
    setContratistaId('')
    setProcesoId('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const hasFilters = areaId || contratistaId || procesoId || fechaDesde || fechaHasta

  if (!user || user.rol_id !== 1) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="panel">
      {/* Header con tabs */}
      <div className="panel-top">
        <div>
          <h3>Reportes y Dashboards</h3>
          <p>Métricas en tiempo real del sistema de expedientes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros globales */}
      <div className="reportes-filters">
        <div className="filter-row">
          <div className="filter-field">
            <label>Área</label>
            <select value={areaId} onChange={e => setAreaId(e.target.value)}>
              <option value="">Todas</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Contratista</label>
            <select value={contratistaId} onChange={e => setContratistaId(e.target.value)}>
              <option value="">Todos</option>
              {contratistas.map(c => (
                <option key={c.id} value={c.id}>{c.razon_social}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Proceso</label>
            <select value={procesoId} onChange={e => setProcesoId(e.target.value)}>
              <option value="">Todos</option>
              {procesos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
            />
          </div>

          {hasFilters && (
            <button className="btn btn-secondary btn-mini" onClick={clearFilters} style={{ alignSelf: 'flex-end' }}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Iframe de Grafana */}
      <div className="reportes-iframe-container">
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            title={`Dashboard ${activeTab}`}
            className="reportes-iframe"
            allowFullScreen
          />
        ) : (
          <div className="empty-state">
            <p>Cargando dashboard...</p>
          </div>
        )}
      </div>
    </div>
  )
}
