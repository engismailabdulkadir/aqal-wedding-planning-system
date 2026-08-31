import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useActiveWedding } from '../hooks/useActiveWedding.js';
import { getCart } from '../services/cartService.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { activeWeddingId } = useActiveWedding();
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!activeWeddingId) {
      setCount(0);
      setTotal(0);
      return;
    }
    try {
      const data = await getCart(activeWeddingId);
      setCount(data.summary?.count || 0);
      setTotal(data.summary?.total || 0);
    } catch {
      setCount(0);
      setTotal(0);
    }
  }, [activeWeddingId]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const value = useMemo(() => ({ count, total, refreshCart }), [count, total, refreshCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useWeddingCart() {
  const ctx = useContext(CartContext);
  return ctx || { count: 0, total: 0, refreshCart: async () => {} };
}
