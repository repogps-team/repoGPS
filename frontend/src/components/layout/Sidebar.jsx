import { Link, useLocation } from 'react-router-dom'

const Sidebar = ({ onLogout, menuItems = [], titulos = {}, usuario = {}, sidebarOpen = false, onNavClick }) => {
  const location = useLocation()

  // Categorías para el menú admin
  const categoriasAdmin = {
    'Gestión': ['dashboard', 'usuarios', 'contratistas', 'areas', 'disciplinas'],
    'Motor de Procesos': ['procesos', 'etapas'],
    'Expedientes': ['expedientes', 'categorias', 'formularios', 'reportes']
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
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">GS</div>
        <div>
          <h2>repoGPS</h2>
          <p>{esAdmin ? 'Admin Panel' : usuario.rol_nombre || 'Usuario'}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {Object.entries(filteredCategorias).map(([categoria, items]) => (
          <div key={categoria} className="nav-categoria">
            <span className="nav-title">{categoria}</span>
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
                >
                  {titulos[id] || id}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-name">{usuario.nombre_completo}</span>
          <span className="user-role">{usuario.rol_nombre}</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </aside>
  )
}

export default Sidebar