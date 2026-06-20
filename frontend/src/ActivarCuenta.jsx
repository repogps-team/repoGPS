import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTheme } from "./context/useTheme";
import "./login.css";

function ActivarCuenta() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "";
  const isDark = theme === "dark";

  const ThemeToggle = () => (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
      title={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
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
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/usuarios/activar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al activar la cuenta");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  // Si no hay token, mostrar error
  if (!token) {
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
                <p>Activación de cuenta</p>
              </div>
            </div>
            <div className="login-copy">
              <span className="login-tag">Error</span>
              <h2>Link inválido</h2>
              <p>
                El link de activación no es válido o está incompleto.
              </p>
            </div>
          </div>
          <div className="login-right">
            <div className="login-card" style={{ textAlign: "center" }}>
              <h3>🔗</h3>
              <h3>Link inválido</h3>
              <p className="login-subtitle">
                No se encontró un token de activación en la URL.
              </p>
              <button onClick={() => navigate("/login")}>
                Ir al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
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
                <p>Activación de cuenta</p>
              </div>
            </div>
            <div className="login-copy">
              <span className="login-tag">Éxito</span>
              <h2>¡Cuenta activada!</h2>
              <p>
                Tu cuenta ha sido activada correctamente. Serás redirigido al inicio de sesión en unos segundos.
              </p>
            </div>
          </div>
          <div className="login-right">
            <div className="login-card" style={{ textAlign: "center" }}>
              <h3>✅</h3>
              <h3>¡Cuenta activada!</h3>
              <p className="login-subtitle">
                Tu cuenta se activó correctamente. Redirigiendo al inicio de sesión...
              </p>
              <button onClick={() => navigate("/login")}>
                Ir al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <p>Activación de cuenta</p>
            </div>
          </div>
          <div className="login-copy">
            <span className="login-tag">Bienvenido</span>
            <h2>Activa tu cuenta</h2>
            <p>
              Establece una contraseña para activar tu cuenta y empezar a usar repoGPS.
            </p>
          </div>
        </div>

        <div className="login-right">
          <form className="login-card" onSubmit={handleSubmit}>
            <h3>Crear contraseña</h3>
            <p className="login-subtitle">Elige una contraseña segura para tu cuenta</p>

            <label>Nueva contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <label>Confirmar contraseña</label>
            <input
              type="password"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Activando..." : "Activar mi cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ActivarCuenta;
