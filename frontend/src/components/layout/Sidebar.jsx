import { Link, useLocation } from 'react-router-dom'

// Inline SVGs minimalistas para cada sección
const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
    </svg>
  ),
  bandeja: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.5 1.89 2.56 3.44 2.56s2.75-1.06 3.44-2.56H19v3zm0-5h-4.56c-.43 1.32-1.49 2.29-2.94 2.29s-2.51-.97-2.94-2.29H5V5h14v9z"/>
    </svg>
  ),
  expedientes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
    </svg>
  ),
  usuarios: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  ),
  contratistas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v5c0 .75.4 1.38 1 1.73V19c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-3.28c.59-.35 1-.99 1-1.72V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm1 13.5h-1v-3h-1v3h-1v-4h3v4zm5 0h-4v-4h4v4zm4-4h-1v3h-1v-3h-1v3h-1v-4h4v4z"/>
    </svg>
  ),
  areas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
    </svg>
  ),
  disciplinas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
    </svg>
  ),
  categorias: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"/>
    </svg>
  ),
  procesos: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  ),
  etapas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
    </svg>
  ),
  formularios: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
    </svg>
  ),
  reportes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h6.17L13.17 7H19v10zm0-12h-6.17L10.83 5H5v14h14V7z"/>
    </svg>
  ),
  transiciones: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
    </svg>
  )
}

const collapseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
  </svg>
)

const expandIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>
)

const logoutIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
)

const Sidebar = ({ onLogout, menuItems = [], titulos = {}, usuario = {}, sidebarOpen = false, onNavClick, sidebarCollapsed = false, onToggleCollapse, tareasPendientes = 0 }) => {
  const location = useLocation()

  // Categorías para el menú admin
  const categoriasAdmin = {
    'Gestión': ['dashboard', 'usuarios', 'contratistas', 'areas', 'disciplinas'],
    'Motor de Procesos': ['procesos', 'etapas'],
    'Expedientes': ['expedientes', 'categorias', 'formularios', 'reportes'],
    'Configuración': ['transiciones']
  }

  // Categorías para el menú no-admin
  const areaLabel = usuario?.area_nombre || (usuario?.area_id ? `Área ${usuario.area_id}` : 'Mi Área')
  const categoriasNoAdmin = {
    [areaLabel]: ['dashboard', 'bandeja', 'expedientes']
  }

  // Usar categorías según el rol
  const esAdmin = usuario?.rol_id === 1
  const seccionesPorCategoria = esAdmin ? categoriasAdmin : categoriasNoAdmin

  // Filtrar categorías según menuItems permitidos
  const filteredCategorias = Object.entries(seccionesPorCategoria).reduce((acc, [categoria, items]) => {
    const filtered = items.filter(id => menuItems.includes(id))
    if (filtered.length > 0) {
      acc[categoria] = filtered
    }
    return acc
  }, {})

  // Función para obtener la ruta basada en el item
  const getRuta = (id) => {
    if (id === 'dashboard') return '/'
    return `/${id}`
  }

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''} ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-mark">GS</div>
        {!sidebarCollapsed && (
          <div>
            <h2>repoGPS</h2>
            <p>{esAdmin ? 'Admin Panel' : usuario.rol_nombre || 'Usuario'}</p>
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {sidebarCollapsed ? expandIcon : collapseIcon}
        </button>
      </div>

      <nav className="sidebar-nav">
        {Object.entries(filteredCategorias).map(([categoria, items]) => (
          <div key={categoria} className="nav-categoria">
            {!sidebarCollapsed && <span className="nav-title">{categoria}</span>}
            {items.map(id => {
              const ruta = getRuta(id)
              const isActive = location.pathname === ruta ||
                (id === 'dashboard' && location.pathname === '/')

              return (
                <Link
                  key={id}
                  to={ruta}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={onNavClick}
                  title={sidebarCollapsed ? (titulos[id] || id) : undefined}
                >
                  <span className="nav-item-icon">{icons[id] || null}</span>
                  {!sidebarCollapsed && (
                    <span className="nav-item-label">
                      {titulos[id] || id}
                      {id === 'bandeja' && tareasPendientes > 0 && (
                        <span className="nav-badge">{tareasPendientes}</span>
                      )}
                    </span>
                  )}
                  {sidebarCollapsed && id === 'bandeja' && tareasPendientes > 0 && (
                    <span className="nav-badge nav-badge--collapsed">{tareasPendientes}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!sidebarCollapsed && (
          <div className="user-info">
            <span className="user-name">{usuario.nombre_completo}</span>
            <span className="user-role">{usuario.rol_nombre}</span>
          </div>
        )}
        <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">
          <span className="logout-icon">{logoutIcon}</span>
          {!sidebarCollapsed && <span className="logout-label">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
