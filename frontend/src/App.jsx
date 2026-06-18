import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Sidebar from './components/layout/Sidebar'
import Content from './components/layout/Content'
import Dashboard from './components/dashboard/Dashboard'
import UsuariosPanel from './components/mantenedores/Usuarios'
import ContratistasPanel from './components/mantenedores/Contratistas'
import AreasPanel from './components/mantenedores/Áreas'
import DisciplinasPanel from './components/mantenedores/Disciplinas'
import CategoriasPanel from './components/mantenedores/Categorias'
import ProcesosPanel from './components/procesos/Procesos'
import EtapasPanel from './components/procesos/Etapas'
import ExpedientesPanel from './components/expedientes/Expedientes'
import BandejaTareas from './components/bandeja/BandejaTareas'
import Login from './Login.jsx'
import ActivarCuenta from './ActivarCuenta.jsx'
import FormList from './components/forms/FormList'
import FormBuilderPage from './components/forms/FormBuilder'
import FormAssignment from './components/forms/FormAssignment'
import FormResponses from './components/forms/FormResponses'
import Reportes from './pages/Reportes'
import FormResponderPage from './pages/FormResponderPage'
import AdminTransiciones from './pages/AdminTransiciones'
import SyncIndicator from './components/layout/SyncIndicator'
import BottomBar from './components/layout/BottomBar'
import { warmupCache } from './lib/cacheWarmup'

// esAdmin: rol_id === 1
const esAdmin = (user) => user?.rol_id === 1

const titulos = {
  dashboard: 'Dashboard',
  bandeja: 'Bandeja de Tareas',
  usuarios: 'Usuarios',
  contratistas: 'Contratistas',
  areas: 'Áreas',
  disciplinas: 'Disciplinas',
  categorias: 'Categorías',
  procesos: 'Procesos',
  etapas: 'Etapas',
  expedientes: 'Expedientes',
  formularios: 'Formularios',
  reportes: 'Reportes',
  transiciones: 'Transiciones por Rol'
}

// Menús por rol
const menuAdmin = ['dashboard', 'usuarios', 'contratistas', 'areas', 'disciplinas', 'categorias', 'procesos', 'etapas', 'expedientes', 'formularios', 'reportes', 'transiciones']
const menuNoAdmin = ['dashboard', 'bandeja', 'expedientes']

// Mapeo de rutas a secciones
const rutaASeccion = {
  '/': 'dashboard',
  '/usuarios': 'usuarios',
  '/contratistas': 'contratistas',
  '/areas': 'areas',
  '/disciplinas': 'disciplinas',
  '/categorias': 'categorias',
  '/procesos': 'procesos',
  '/etapas': 'etapas',
  '/expedientes': 'expedientes',
  '/bandeja': 'bandeja',
  '/formularios': 'formularios',
  '/reportes': 'reportes'
}

// Wrapper para Expedientes que lee filtros + abrir expediente de la URL
const ExpedientesWrapper = ({ user }) => {
  const [searchParams] = useSearchParams()
  const filtroEstadoInicial = searchParams.get('estado') || 'todos'
  const filtroSlaInicial = searchParams.get('sla') || 'todos'
  const abrirExpedienteId = searchParams.get('abrir')
    ? parseInt(searchParams.get('abrir'), 10)
    : null

  return <ExpedientesPanel
    user={user}
    filtroEstadoInicial={filtroEstadoInicial}
    filtroSlaInicial={filtroSlaInicial}
    abrirExpedienteId={abrirExpedienteId}
  />
}

const SidebarLayout = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [tareasPendientes, setTareasPendientes] = useState(0)

  // Cargar contador de tareas pendientes para el badge del sidebar
  useEffect(() => {
    if (!user?.id) return
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem('token')
        const baseUrl = import.meta.env.VITE_API_URL || ''
        const params = new URLSearchParams({ usuario_id: user.id })
        if (user.area_id) params.append('area_id', user.area_id)
        if (user.rol_id) params.append('rol_id', user.rol_id)
        const res = await fetch(`${baseUrl}/api/tareas/mis-tareas?${params}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        if (res.ok) {
          const data = await res.json()
          setTareasPendientes(Array.isArray(data) ? data.filter(t => t.estado === 'pendiente').length : 0)
        }
      } catch { /* silently fail */ }
    }
    fetchCount()
  }, [user])

  const toggleSidebar = () => setSidebarOpen(prev => !prev)
  const closeSidebar = () => setSidebarOpen(false)
  const toggleCollapse = () => setSidebarCollapsed(prev => !prev)

  // En la PWA (Vercel) solo usuarios no-admin
  useEffect(() => {
    const esVercel = window.location.hostname.includes('vercel.app')
    if (esVercel && user?.rol_id === 1) {
      localStorage.setItem('logout_message', 'La versión PWA es solo para usuarios no administradores.')
      logout()
    }
  }, [user, logout])

  // Precargar cache del SW con todos los endpoints al iniciar sesión
  useEffect(() => {
    if (user) {
      warmupCache(esAdmin(user))
    }
  }, [user])

  // Determinar sección actual basada en la ruta
  const seccionActual = rutaASeccion[location.pathname] || 'dashboard'

  const menuItems = esAdmin(user) ? menuAdmin : menuNoAdmin

  const handleLogout = () => {
    logout()
  }

  const isAdmin = esAdmin(user)

  return (
    <div className={`layout ${isAdmin ? 'role-admin' : 'role-non-admin'}`}>
      <SyncIndicator />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      <Sidebar
        onLogout={handleLogout}
        menuItems={menuItems}
        titulos={titulos}
        usuario={user}
        sidebarOpen={sidebarOpen}
        onNavClick={closeSidebar}
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
        tareasPendientes={tareasPendientes}
      />
      <Content
        titulo={titulos[seccionActual]}
        isAdmin={isAdmin}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      >
        <Routes>
          <Route index element={<Dashboard user={user} esAdmin={esAdmin(user)} />} />
          <Route path="usuarios" element={<UsuariosPanel />} />
          <Route path="contratistas" element={<ContratistasPanel />} />
          <Route path="areas" element={<AreasPanel />} />
          <Route path="disciplinas" element={<DisciplinasPanel />} />
          <Route path="categorias" element={<CategoriasPanel />} />
          <Route path="procesos" element={<ProcesosPanel />} />
          <Route path="etapas" element={<EtapasPanel />} />
          <Route path="expedientes" element={<ExpedientesWrapper user={user} />} />
          <Route path="expedientes/:expedienteId/responder/:formId" element={<FormResponderPage />} />
          <Route path="bandeja" element={<BandejaTareas user={user} />} />
          <Route path="formularios" element={<FormList />} />
          <Route path="formularios/crear" element={<FormBuilderPage />} />
          <Route path="formularios/:id/editar" element={<FormBuilderPage />} />
          <Route path="formularios/asignar" element={<FormAssignment />} />
          <Route path="formularios/:id/respuestas" element={<FormResponses />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="transiciones" element={<AdminTransiciones />} />
        </Routes>
      </Content>

      {/* Bottom navigation for non-admin mobile */}
      {!isAdmin && <BottomBar titulos={titulos} onLogout={handleLogout} />}
    </div>
  )
}

// Componente que protege las rutas
const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  if (!user) {
    return null // El efecto arriba maneja la navegación
  }

  return <SidebarLayout />
}

// Componente para la página de login
const LoginPage = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  return <Login />
}

const App = () => {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activar" element={<ActivarCuenta />} />
        <Route path="/*" element={<ProtectedRoute />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App