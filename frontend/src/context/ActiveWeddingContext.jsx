/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { isCoupleRole } from '../utils/roles.js';
import { getWeddings } from '../services/weddingService.js';

const ActiveWeddingContext = createContext(null);

export function ActiveWeddingProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [weddings, setWeddings] = useState([]);
  const [activeWeddingId, setActiveWeddingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const storageKey = user?._id ? `activeWeddingId:${user._id}` : null;

  const refreshWeddings = useCallback(async (preferredId) => {
    if (!isAuthenticated || !isCoupleRole(user?.role)) { setWeddings([]); setActiveWeddingId(null); return []; }
    setLoading(true); setError('');
    try {
      const data = await getWeddings(); const list = data.weddings;
      setWeddings(list);
      const stored = preferredId || (storageKey ? localStorage.getItem(storageKey) : null);
      const selected = list.find((wedding) => wedding._id === stored) || list[0] || null;
      setActiveWeddingId(selected?._id || null);
      if (storageKey) { if (selected) { localStorage.setItem(storageKey, selected._id); localStorage.setItem('activeWeddingId', selected._id); } else { localStorage.removeItem(storageKey); localStorage.removeItem('activeWeddingId'); } }
      return list;
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not load weddings'); return []; }
    finally { setLoading(false); }
  }, [isAuthenticated, storageKey, user?.role]);

  useEffect(() => { refreshWeddings(); }, [refreshWeddings]);
  const selectWedding = useCallback((id) => { if (!weddings.some((wedding) => wedding._id === id)) return false; setActiveWeddingId(id); localStorage.setItem('activeWeddingId', id); if (storageKey) localStorage.setItem(storageKey, id); return true; }, [storageKey, weddings]);
  const activeWedding = weddings.find((wedding) => wedding._id === activeWeddingId) || null;
  const value = useMemo(() => ({ weddings, activeWedding, activeWeddingId, loading, error, selectWedding, refreshWeddings }), [weddings, activeWedding, activeWeddingId, loading, error, selectWedding, refreshWeddings]);
  return <ActiveWeddingContext.Provider value={value}>{children}</ActiveWeddingContext.Provider>;
}
export { ActiveWeddingContext };
