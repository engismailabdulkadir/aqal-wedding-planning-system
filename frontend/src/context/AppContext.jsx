import { createContext, useMemo } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const value = useMemo(() => ({ appName: 'EverAfter' }), []);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export { AppContext };
