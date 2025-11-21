import { createContext, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "careforall_token";

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload));
  } catch (error) {
    console.warn("Failed to decode token", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(() => (token ? decodeToken(token) : null));

  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem(STORAGE_KEY, newToken);
    setUser(decodeToken(newToken));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ token, user, login, logout, isAuthenticated: Boolean(token) }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
