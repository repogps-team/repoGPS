import { useState, useEffect, useCallback, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useAreas } from '../hooks/useAreas'
import { useProcesos } from '../hooks/useProcesos'
import { useUsuarios } from '../hooks/useUsuarios'
import { useEtapas } from '../hooks/useEtapas'

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

function getDefaultFechaDesde() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

function getDefaultFechaHasta() {
  return new Date().toISOString().split('T')[0]
}

export default function Reportes() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [activeAuditTab, setActiveAuditTab] = useState('audit-actividad')
  const [iframeSrc, setIframeSrc] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasApplied, setHasApplied] = useState(false)

  // Filtros — fecha con defaults, resto vacío (opcional)
  const [areaId, setAreaId] = useState('')
  const [contratistaId, setContratistaId] = useState('')
  const [procesoId, setProcesoId] = useState('')
  const [fechaDesde, setFechaDesde] = useState(getDefaultFechaDesde)
  const [fechaHasta, setFechaHasta] = useState(getDefaultFechaHasta)
  const [usuarioId, setUsuarioId] = useState('')
  const [etapaId, setEtapaId] = useState('')

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
  const { usuarios, cargarUsuarios } = useUsuarios()
  const { etapas, cargarEtapas } = useEtapas()

  useEffect(() => {
    cargarAreas()
    cargarContratistas()
    cargarProcesos()
    cargarUsuarios()
    cargarEtapas()
    return () => {
      mountedRef.current = false
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
    }
  }, [])

  // Auto-load en mount con fechas por defecto
  useEffect(() => {
    setHasApplied(true)
    setIsLoading(true)
    const src = buildIframeSrc('general', 'audit-actividad', '', '', '', getDefaultFechaDesde(), getDefaultFechaHasta(), '', '')
    setIframeSrc(src)
  }, [])

  // Construir URL del iframe con filtros como variables de Grafana
  const buildIframeSrc = useCallback((tab, auditTab, area, contratista, proceso, desde, hasta, usuario, etapa) => {
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
    if (usuario) params.set('var-usuario', usuario)
    if (etapa) params.set('var-etapa', etapa)

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
      activeTab, activeAuditTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, usuarioId, etapaId
    )
    setIframeSrc(src)
  }, [activeTab, activeAuditTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, usuarioId, etapaId, buildIframeSrc])

  // Limpiar filtros y recargar con defaults
  const clearAndApply = useCallback(() => {
    const defaultDesde = getDefaultFechaDesde()
    const defaultHasta = getDefaultFechaHasta()
    setAreaId('')
    setContratistaId('')
    setProcesoId('')
    setFechaDesde(defaultDesde)
    setFechaHasta(defaultHasta)
    setUsuarioId('')
    setEtapaId('')
    setHasApplied(true)
    setIsLoading(true)
    const src = buildIframeSrc(activeTab, activeAuditTab, '', '', '', defaultDesde, defaultHasta, '', '')
    setIframeSrc(src)
  }, [activeTab, activeAuditTab, buildIframeSrc])

  // Cambio de tab: cargar el nuevo dashboard con los filtros actuales
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
    setIsLoading(true)
    const auditTab = tabId === 'auditoria' ? activeAuditTab : null
    setIframeSrc(buildIframeSrc(
      tabId, auditTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, usuarioId, etapaId
    ))
  }, [activeAuditTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, usuarioId, etapaId, buildIframeSrc])

  // Cambio de sub-tab de auditoría
  const handleAuditTabChange = useCallback((auditTabId) => {
    setActiveAuditTab(auditTabId)
    if (activeTab === 'auditoria') {
      setIsLoading(true)
      setIframeSrc(buildIframeSrc(
        'auditoria', auditTabId, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, usuarioId, etapaId
      ))
    }
  }, [activeTab, areaId, contratistaId, procesoId, fechaDesde, fechaHasta, usuarioId, etapaId, buildIframeSrc])

  const areasActivas = areas.filter(area => area.estado_activo !== false)
  const contratistasActivos = contratistas.filter(contratista => contratista.estado_activo !== false)
  const procesosActivos = procesos.filter(proceso => proceso.estado_activo !== false)

  const hasFilters = areaId || contratistaId || procesoId || usuarioId || etapaId
    || fechaDesde !== getDefaultFechaDesde() || fechaHasta !== getDefaultFechaHasta()

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

          <div className="filter-field">
            <label>Usuario</label>
            <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre_completo}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Etapa</label>
            <select value={etapaId} onChange={e => setEtapaId(e.target.value)}>
              <option value="">Todas</option>
              {etapas.map(ep => (
                <option key={ep.id} value={ep.id}>{ep.nombre}</option>
              ))}
            </select>
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
          <div className="reportes-spinner" />
          <p>Cargando dashboard...</p>
        </div>
      </div>
    </div>
  )
}
