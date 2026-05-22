import { createContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export { AuthContext }

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      if (token && userData) {
        return JSON.parse(userData)
      }
    }
    return null
  })
  const [loading] = useState(false)

  const login = useCallback((token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('lastOfflineUser', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.setItem('logout_message', 'Sesión cerrada correctamente')
    setUser(null)
  }, [])

  const offlineLogin = useCallback(() => {
    const lastUser = localStorage.getItem('lastOfflineUser')
    if (lastUser) {
      const userData = JSON.parse(lastUser)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return true
    }
    return false
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, offlineLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
