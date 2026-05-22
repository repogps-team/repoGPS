import { useEffect } from 'react'
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
import FormList from './components/forms/FormList'
import FormBuilderPage from './components/forms/FormBuilder'
import FormAssignment from './components/forms/FormAssignment'
import FormResponses from './components/forms/FormResponses'
import Reportes from './pages/Reportes'
import SyncIndicator from './components/layout/SyncIndicator'

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
  reportes: 'Reportes'
}

// Menús por rol
const menuAdmin = ['dashboard', 'usuarios', 'contratistas', 'areas', 'disciplinas', 'categorias', 'procesos', 'etapas', 'expedientes', 'formularios', 'reportes']
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

// Wrapper para Expedientes que lee filtros de la URL
const ExpedientesWrapper = ({ user }) => {
  const [searchParams] = useSearchParams()
  const filtroEstadoInicial = searchParams.get('estado') || 'todos'
  const filtroSlaInicial = searchParams.get('sla') || 'todos'

  return <ExpedientesPanel
    user={user}
    filtroEstadoInicial={filtroEstadoInicial}
    filtroSlaInicial={filtroSlaInicial}
  />
}

const SidebarLayout = () => {
  const location = useLocation()
  const { user, logout } = useAuth()

  // Determinar sección actual basada en la ruta
  const seccionActual = rutaASeccion[location.pathname] || 'dashboard'

  const menuItems = esAdmin(user) ? menuAdmin : menuNoAdmin

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="layout">
      <SyncIndicator />
      <Sidebar
        seccionActual={seccionActual}
        onLogout={handleLogout}
        menuItems={menuItems}
        titulos={titulos}
        usuario={user}
      />
      <Content titulo={titulos[seccionActual]}>
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
          <Route path="bandeja" element={<BandejaTareas user={user} />} />
          <Route path="formularios" element={<FormList />} />
          <Route path="formularios/crear" element={<FormBuilderPage />} />
          <Route path="formularios/:id/editar" element={<FormBuilderPage />} />
          <Route path="formularios/asignar" element={<FormAssignment />} />
          <Route path="formularios/:id/respuestas" element={<FormResponses />} />
          <Route path="reportes" element={<Reportes />} />
        </Routes>
      </Content>
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
        <Route path="/*" element={<ProtectedRoute />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App