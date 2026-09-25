import { createContext, useContext, useState } from 'react';
import * as authService from '../api/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuth, setIsAuth] = useState(authService.isAuthenticated());

  const login = async (username, password) => {
    await authService.login(username, password);
    setIsAuth(true);
  };

  const logout = () => {
    authService.logout();
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider value={{ isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);