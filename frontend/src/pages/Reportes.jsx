import { useState, useEffect, useCallback, useRef } from 'react'
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

  const iframeRef = useRef(null)
  const pendingFilterRef = useRef(null)

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

    return `/grafana/d/${uid}?${params.toString()}`
  }, [activeTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta])

  // Carga inicial: montar el iframe con el primer tab
  useEffect(() => {
    setIframeSrc(buildIframeSrc())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cambio de tab: recarga completa del iframe (distinto dashboard)
  useEffect(() => {
    if (!iframeSrc) return // skip initial mount
    setIframeSrc(buildIframeSrc())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Cambio de filtros: actualiza la URL del iframe SIN recargar
  // (same-origin: nginx proxy /grafana/)
  useEffect(() => {
    if (!iframeRef.current) return

    // Debounce: agrupar cambios rápidos de filtros
    if (pendingFilterRef.current) clearTimeout(pendingFilterRef.current)

    pendingFilterRef.current = setTimeout(() => {
      const iframe = iframeRef.current
      if (!iframe || !iframe.contentWindow) return

      const newUrl = buildIframeSrc()

      try {
        // Same-origin check: acceder a location.href tira error si es cross-origin
        const currentHref = iframe.contentWindow.location.href
        if (!currentHref) throw new Error('no href') // safety

        // Mismo dashboard? Solo actualizar query params sin recargar
        const currentPath = iframe.contentWindow.location.pathname
        const dashboardPath = `/grafana/d/${DASHBOARD_UIDS[activeTab]}`

        if (currentPath === dashboardPath) {
          const urlObj = new URL(newUrl, iframe.contentWindow.location.origin)
          iframe.contentWindow.history.replaceState(null, '', urlObj.pathname + urlObj.search)
          // Disparar evento para que Grafana reaccione al cambio de URL
          iframe.contentWindow.dispatchEvent(new PopStateEvent('popstate'))
        } else {
          // Ruta distinta (otro dashboard) → recarga completa
          iframe.src = newUrl
        }
      } catch {
        // Cross-origin o error → recarga completa como fallback
        iframe.src = newUrl
      }
    }, 400)

    return () => {
      if (pendingFilterRef.current) clearTimeout(pendingFilterRef.current)
    }
  }, [areaId, contratistaId, procesoId, fechaDesde, fechaHasta, activeTab, buildIframeSrc])

  const clearFilters = () => {
    setAreaId('')
    setContratistaId('')
    setProcesoId('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const areasActivas = areas.filter(area => area.estado_activo !== false)
  const contratistasActivos = contratistas.filter(contratista => contratista.estado_activo !== false)
  const procesosActivos = procesos.filter(proceso => proceso.estado_activo !== false)

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
              {areasActivas.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Contratista</label>
            <select value={contratistaId} onChange={e => setContratistaId(e.target.value)}>
              <option value="">Todos</option>
              {contratistasActivos.map(c => (
                <option key={c.id} value={c.id}>{c.razon_social}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Proceso</label>
            <select value={procesoId} onChange={e => setProcesoId(e.target.value)}>
              <option value="">Todos</option>
              {procesosActivos.map(p => (
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
            ref={iframeRef}
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
