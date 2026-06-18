import { useEffect, useState, useMemo } from "react";
import { useAuth } from "./context/useAuth";
import { useTheme } from "./context/useTheme";
import "./login.css";

function Login() {
  const { login, offlineLogin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mensajeInfo, setMensajeInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const hayOffline = useMemo(() => {
    return !navigator.onLine && localStorage.getItem('lastOfflineUser')
  }, [])

  const API_URL = import.meta.env.VITE_API_URL || "";
  const PWA_URL = import.meta.env.VITE_PWA_URL || "https://repo-gps.vercel.app";
  const isDark = theme === 'dark'

  // Detect deployment context
  const esPacheco = !window.location.hostname.includes('vercel.app')
  const esVercel = !esPacheco
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const [redirecting, setRedirecting] = useState(false)

  // On pacheco + mobile → auto-redirect to PWA on Vercel
  useEffect(() => {
    if (esPacheco && isMobile) {
      setRedirecting(true)
      const timer = setTimeout(() => {
        window.location.href = PWA_URL
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [esPacheco, isMobile, PWA_URL])

  const ThemeToggle = () => (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
      title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      {isDark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )

  useEffect(() => {
    const logoutMessage = localStorage.getItem("logout_message");
    if (logoutMessage) {
      setMensajeInfo(logoutMessage);
      localStorage.removeItem("logout_message");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensajeInfo("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ correo, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      // En la PWA (Vercel) solo usuarios no-admin pueden acceder
      if (esVercel && data.usuario?.rol_id === 1) {
        setError("La versión PWA es solo para usuarios no administradores. Accede desde el escritorio.");
        return;
      }

      login(data.token, data.usuario)
    } catch {
      setError("No se pudo conectar con el servidor");
      if (hayOffline) {
        setMensajeInfo("¿Querés continuar con los datos guardados sin conexión?")
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="login-shell">
        <div className="login-left">
          <div className="brand">
            <div className="brand-badge">GS</div>
            <div>
              <h1>repoGPS</h1>
              <p>Panel de acceso</p>
            </div>
          </div>

          <div className="login-copy">
            <span className="login-tag">Sistema de Gestión</span>
            <h2>Bienvenida de vuelta</h2>
            <p>
              Ingresa con tu correo y contraseña para acceder al panel
              administrativo.
            </p>
          </div>

          {redirecting ? (
            <div className="pwa-redirecting">
              <div className="pwa-redirecting-spinner"></div>
              <p>Redirigiendo a la versión móvil...</p>
            </div>
          ) : esPacheco && !isMobile && (
            <a
              href={PWA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pwa"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="14" rx="2" ry="2"/>
                <line x1="3" y1="21" x2="21" y2="21"/>
                <polyline points="9 9 12 12 15 9"/>
                <line x1="12" y1="12" x2="12" y2="3"/>
              </svg>
              Usar PWA 📱
            </a>
          )}
        </div>

        <div className="login-right">
          <form className="login-card" onSubmit={handleSubmit}>
            <h3>Iniciar sesión</h3>
            <p className="login-subtitle">Accede a tu cuenta</p>

            {mensajeInfo && (
              <p style={{
                background: 'var(--success-bg, #e8f5e9)',
                color: 'var(--success-text, #1b5e20)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--success-color, #c8e6c9)',
                marginBottom: '12px'
              }}>
                {mensajeInfo}
              </p>
            )}

            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />

            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="login-error">{error}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Iniciando..." : "Entrar"}
              </button>

              {hayOffline && (
                <button
                  type="button"
                  className="btn-offline"
                  onClick={() => offlineLogin()}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '10px',
                    background: 'transparent',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '6px',
                    color: 'var(--text-main, #334155)',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
                    <path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2z"/>
                    <path d="M12 12V6m0 0L9 9m3-3l3 3"/>
                  </svg>
                  Continuar sin conexión
                </button>
              )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
