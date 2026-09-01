import { createContext, useEffect, useState } from 'react';
import * as authService from '../services/authService.js';

// Furayaasha lagu kaydiyo token-ka iyo xogta user-ka
const TOKEN_KEY = 'wedding_token';
const USER_KEY = 'wedding_user';

// Context-ka authentication-ka
const AuthContext = createContext(null);

/**
 * Furayaasha login-ka ee aan waligood sii jiri karin marka user-ku logout sameeyo.
 * Tani waa difaac dheeraad ah oo looga hortagayo in password ama login data
 * hore loo isticmaalo.
 */
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

// Kaydi session-ka user-ka marka uu login/register sameeyo
function persistSession(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

// Tirtir dhammaan xogaha login-ka ee localStorage iyo sessionStorage
function clearLoginFormPersistence() {
  LOGIN_FORM_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

// Tirtir session-ka user-ka iyo xogaha la xiriira
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('activeWeddingId');
  clearLoginFormPersistence();
}

// Provider-ka authentication-ka ee application-ka oo dhan
export function AuthProvider({ children }) {
  // Hel token-ka horey localStorage ugu jiray
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  // Hel user-ka horey localStorage ugu jiray
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });

  // Haddii token jiro, marka hore session-ka waa loading
  const [loading, setLoading] = useState(Boolean(token));

  // Hubi user-ka server-ka marka token jiro
  useEffect(() => {
    if (!token) return;

    let active = true;

    authService.getCurrentUser()
      .then(({ user: currentUser }) => {
        if (!active) return;

        // Cusboonaysii user-ka
        setUser(currentUser);

        // Ku kaydi user-ka cusub localStorage
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        if (!active) return;

        // Haddii token-ku shaqayn waayo, session-ka nadiifi
        clearSession();
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Function-ka login-ka
  async function login(credentials) {
    const data = await authService.login({
      username: credentials.username,
      password: credentials.password,
    });

    // Kaydi session-ka
    persistSession(data);

    // Cusboonaysii state-yada
    setToken(data.token);
    setUser(data.user);

    return data.user;
  }

  // Function-ka register-ka
  async function register(userData) {
    const data = await authService.register(userData);

    // Kaydi session-ka cusub
    persistSession(data);

    // Cusboonaysii authentication state
    setToken(data.token);
    setUser(data.user);

    return data.user;
  }

  // Function-ka logout-ka
  async function logout() {
    try {
      // Server-ka u sheeg in user-ku logout sameeyay
      await authService.logout();
    } finally {
      // Xitaa haddii server-ku error sameeyo, client-ka session-ka waa la tirtirayaa
      clearSession();

      setToken(null);
      setUser(null);
      setLoading(false);
    }
  }

  // Xogta loo gudbinayo dhammaan components-ka isticmaalaya AuthContext
  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Export garee Context-ka si useAuth hook uu u isticmaalo
export { AuthContext };