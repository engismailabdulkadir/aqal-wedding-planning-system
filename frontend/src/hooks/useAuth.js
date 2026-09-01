import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

// Custom hook loogu talagalay in components-ku si fudud u helaan authentication data
export function useAuth() {
  // Ka soo qaado xogta AuthContext
  const context = useContext(AuthContext);

  // Haddii hook-ga lagu isticmaalay meel aan AuthProvider ku jirin, error muuji
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  // Soo celi user, token, login, register, logout, iwm.
  return context;
}