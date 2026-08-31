import { createContext, useEffect, useState } from 'react';
import * as authService from '../services/authService.js';

const TOKEN_KEY = 'wedding_token';
const USER_KEY = 'wedding_user';
const AuthContext = createContext(null);

/** Login credential keys that must never remain after logout (defense in depth). */
const LOGIN_FORM_KEYS = [
  'username',
  'password',
  'loginUsername',
  'loginPassword',
  'savedCredentials',
  'rememberedUser',
  'loginFormData',
  'wedding_remember_username',
  'wedding_remember_password',
];

function persistSession(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function clearLoginFormPersistence() {
  LOGIN_FORM_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('activeWeddingId');
  clearLoginFormPersistence();
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    let active = true;
    authService.getCurrentUser()
      .then(({ user: currentUser }) => {
        if (!active) return;
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        setToken(null);
        setUser(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function login(credentials) {
    const data = await authService.login({
      username: credentials.username,
      password: credentials.password,
    });
    persistSession(data);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(userData) {
    const data = await authService.register(userData);
    persistSession(data);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      clearSession();
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  }

  const value = { user, token, loading, isAuthenticated: Boolean(token && user), login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
