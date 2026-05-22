import { Link, useLocation } from 'react-router-dom'

// Inline SVGs minimalistas estilo Material
const icons = {
  dashboard: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
    </svg>
  ),
  bandeja: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.5 1.89 2.56 3.44 2.56s2.75-1.06 3.44-2.56H19v3zm0-5h-4.56c-.43 1.32-1.49 2.29-2.94 2.29s-2.51-.97-2.94-2.29H5V5h14v9z"/>
    </svg>
  ),
  expedientes: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
    </svg>
  ),
  logout: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  )
}

const items = [
  { id: 'dashboard', path: '/', label: 'Dashboard' },
  { id: 'bandeja', path: '/bandeja', label: 'Bandeja' },
  { id: 'expedientes', path: '/expedientes', label: 'Expedientes' }
]

const BottomBar = ({ titulos = {}, onLogout }) => {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bottom-bar">
      {items.map(item => (
        <Link
          key={item.id}
          to={item.path}
          className={`bottom-bar-item ${isActive(item.path) ? 'active' : ''}`}
        >
          {icons[item.id] || null}
          <span className="bottom-bar-label">{titulos[item.id] || item.label}</span>
        </Link>
      ))}
      <button className="bottom-bar-item bottom-bar-logout" onClick={onLogout}>
        {icons.logout}
        <span className="bottom-bar-label">Salir</span>
      </button>
    </nav>
  )
}

export default BottomBar
