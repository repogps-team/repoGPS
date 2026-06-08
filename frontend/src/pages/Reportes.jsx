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
  'bandeja-tareas': 'dash-bandeja-tareas',
  'tiempos-sla': 'dash-tiempos-sla',
  'funnel-workflow': 'dash-funnel-workflow',
  'rechazos': 'dash-rechazos',
  'formularios': 'dash-formularios',
  'almacenamiento': 'dash-almacenamiento',
  'usuarios-actividad': 'dash-usuarios-actividad',
  'comparativa-contratistas': 'dash-comparativa-contratistas',
  'audit-actividad': 'audit-actividad',
  'audit-seguridad': 'audit-seguridad',
  'audit-expediente': 'audit-expediente',
}

const TABS = [
  { id: 'general', label: 'Dashboard General' },
  { id: 'productividad', label: 'Productividad' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'trazabilidad', label: 'Trazabilidad' },
  { id: 'bandeja-tareas', label: 'Bandeja de Tareas' },
  { id: 'tiempos-sla', label: 'Tiempos / SLA' },
  { id: 'funnel-workflow', label: 'Funnel Workflow' },
  { id: 'rechazos', label: 'Rechazos' },
  { id: 'formularios', label: 'Formularios' },
  { id: 'almacenamiento', label: 'Almacenamiento' },
  { id: 'usuarios-actividad', label: 'Usuarios / Actividad' },
  { id: 'comparativa-contratistas', label: 'Comparativa Contratistas' },
  { id: 'auditoria', label: 'Auditoría' },
]

const AUDIT_TABS = [
  { id: 'audit-actividad', label: 'Actividad' },
  { id: 'audit-seguridad', label: 'Seguridad' },
  { id: 'audit-expediente', label: 'Expediente' },
]

export default function Reportes() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [activeAuditTab, setActiveAuditTab] = useState('audit-actividad')
  const [iframeSrc, setIframeSrc] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasApplied, setHasApplied] = useState(false)

  // Filtros
  const [areaId, setAreaId] = useState('')
  const [contratistaId, setContratistaId] = useState('')
  const [procesoId, setProcesoId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const iframeRef = useRef(null)
  const pollRef = useRef(null)
  const mountedRef = useRef(true)
  const loadingTimeoutRef = useRef(null)

  // Agregar 3 segundos extras al overlay de carga
  const finishLoading = useCallback(() => {
    if (!mountedRef.current) return
    loadingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setIsLoading(false)
    }, 3000)
  }, [])

  // Cargar datos para filtros
  const { areas, contratistas, cargarAreas, cargarContratistas } = useAreas()
  const { procesos, cargarProcesos } = useProcesos()

  useEffect(() => {
    cargarAreas()
    cargarContratistas()
    cargarProcesos()
    return () => {
      mountedRef.current = false
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
    }
  }, [])

  // Construir URL del iframe con filtros como variables de Grafana
  const buildIframeSrc = useCallback((tab, auditTab, area, contratista, proceso, desde, hasta) => {
    const dashboardKey = tab === 'auditoria' ? auditTab : tab
    const uid = DASHBOARD_UIDS[dashboardKey]
    const params = new URLSearchParams({
      orgId: '1',
      kiosk: 'tv',
      refresh: '30s',
    })

    // Variables de Grafana (prefijo var-)
    if (area) params.set('var-area', area)
    if (contratista) params.set('var-contratista', contratista)
    if (proceso) params.set('var-proceso', proceso)
    if (desde) params.set('var-fecha_desde', desde)
    if (hasta) params.set('var-fecha_hasta', hasta)

    return `/grafana/d/${uid}?${params.toString()}`
  }, [])

  // Detectar cuando Grafana terminó de cargar (same-origin)
  const startPollingDashboard = useCallback(() => {
    // Limpiar polling anterior
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(() => {
      try {
        const iframe = iframeRef.current
        if (!iframe || !iframe.contentDocument) return

        const doc = iframe.contentDocument

        // Grafana lista si hay paneles visibles
        const panels = doc.querySelectorAll(
          '.panel-container, [data-panelid], .dashboard-content'
        )

        // También verificar que NO esté mostrando el spinner de carga de Grafana
        const loadingIndicator = doc.querySelectorAll(
          '.css-1ld0rbn, .css-ueo4r3, [class*="loading"]'
        )

        if (panels.length > 0 || loadingIndicator.length === 0) {
          finishLoading()
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch {
        // Same-origin fallback: esperar un tiempo fijo
        // (no debería pasar porque es mismo origen)
      }
    }, 150)

    // Timeout de seguridad: ocultar overlay después de 20s máximo
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      finishLoading()
    }, 20000)
  }, [])

  // Cuando el iframe termina de cargar el HTML, empezamos a sondear los paneles
  const handleIframeLoad = useCallback(() => {
    startPollingDashboard()
  }, [startPollingDashboard])

  // Aplicar filtros: cargar el iframe con los filtros seleccionados
  const applyFilters = useCallback(() => {
    setHasApplied(true)
    setIsLoading(true)
    const src = buildIframeSrc(
      activeTab, activeAuditTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta
    )
    setIframeSrc(src)
  }, [activeTab, activeAuditTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, buildIframeSrc])

  // Limpiar filtros y recargar
  const clearAndApply = useCallback(() => {
    setAreaId('')
    setContratistaId('')
    setProcesoId('')
    setFechaDesde('')
    setFechaHasta('')
    // Aplicar con filtros vacíos
    setHasApplied(true)
    setIsLoading(true)
    const src = buildIframeSrc(activeTab, activeAuditTab, '', '', '', '', '')
    setIframeSrc(src)
  }, [activeTab, activeAuditTab, buildIframeSrc])

  // Cambio de tab: cargar el nuevo dashboard con los filtros actuales
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
    if (hasApplied) {
      setIsLoading(true)
      const auditTab = tabId === 'auditoria' ? activeAuditTab : null
      setIframeSrc(buildIframeSrc(
        tabId, auditTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta
      ))
    }
  }, [hasApplied, activeAuditTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, buildIframeSrc])

  // Cambio de sub-tab de auditoría
  const handleAuditTabChange = useCallback((auditTabId) => {
    setActiveAuditTab(auditTabId)
    if (hasApplied && activeTab === 'auditoria') {
      setIsLoading(true)
      setIframeSrc(buildIframeSrc(
        'auditoria', auditTabId, areaId, contratistaId, procesoId, fechaDesde, fechaHasta
      ))
    }
  }, [hasApplied, activeTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, buildIframeSrc])

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
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tabs de Auditoría */}
      {activeTab === 'auditoria' && (
        <div className="tabs audit-sub-tabs">
          {AUDIT_TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn sub-tab-btn ${activeAuditTab === tab.id ? 'active' : ''}`}
              onClick={() => handleAuditTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

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

          <div className="filter-actions">
            <button className="btn btn-primary btn-mini" onClick={applyFilters}>
              Aplicar filtros
            </button>
            {hasFilters && (
              <button className="btn btn-secondary btn-mini" onClick={clearAndApply}>
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenedor del iframe + overlay */}
      <div className="reportes-iframe-container">
        {iframeSrc ? (
          <>
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              onLoad={handleIframeLoad}
              title={`Dashboard ${activeTab}`}
              className="reportes-iframe"
              allowFullScreen
            />

            {/* Overlay de carga */}
            <div className={`reportes-overlay${isLoading ? '' : ' hidden'}`}>
              {!hasApplied ? (
                <>
                  <h2>Filtre los datos para cargar los dashboards de reportes</h2>
                  <p>Seleccione los filtros que desee y haga clic en "Aplicar filtros"</p>
                </>
              ) : (
                <>
                  <div className="reportes-spinner" />
                  <p>Cargando dashboard...</p>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Seleccione los filtros y haga clic en "Aplicar filtros" para comenzar</p>
          </div>
        )}
      </div>
    </div>
  )
}
