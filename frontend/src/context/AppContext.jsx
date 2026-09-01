import { createContext, useMemo } from 'react';

// Context-ka guud ee application-ka
const AppContext = createContext(null);

// Provider-ka AppContext
export function AppProvider({ children }) {

  // Xogta guud ee application-ka
  // useMemo waxay ka hortagtaa in object-ka mar kasta dib loo sameeyo
  const value = useMemo(
    () => ({
      appName: 'EverAfter',
    }),
    []
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Export garee Context-ka
export { AppContext };