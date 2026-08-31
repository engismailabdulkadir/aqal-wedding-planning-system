import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import CreateWeddingModal from '../components/wedding/CreateWeddingModal.jsx';

const CreateWeddingContext = createContext(null);

export function CreateWeddingProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openCreateWedding = useCallback(() => setOpen(true), []);
  const closeCreateWedding = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openCreateWedding, closeCreateWedding }),
    [open, openCreateWedding, closeCreateWedding],
  );

  return (
    <CreateWeddingContext.Provider value={value}>
      {children}
      <CreateWeddingModal isOpen={open} onClose={closeCreateWedding} />
    </CreateWeddingContext.Provider>
  );
}

export function useCreateWedding() {
  const context = useContext(CreateWeddingContext);
  if (!context) throw new Error('useCreateWedding must be used within CreateWeddingProvider');
  return context;
}
