import api from './api.js';

export async function getCart(weddingId) {
  const { data } = await api.get('/cart', {
    headers: { 'X-Wedding-Id': weddingId || '' },
    params: weddingId ? { weddingId } : undefined,
  });
  return data;
}

export async function addToCart(payload, weddingId) {
  const { data } = await api.post('/cart/items', payload, {
    headers: { 'X-Wedding-Id': weddingId || '' },
  });
  return data;
}

export async function updateCartItem(id, payload, weddingId) {
  const { data } = await api.patch(`/cart/items/${id}`, payload, {
    headers: { 'X-Wedding-Id': weddingId || '' },
  });
  return data;
}

export async function removeCartItem(id, weddingId) {
  const { data } = await api.delete(`/cart/items/${id}`, {
    headers: { 'X-Wedding-Id': weddingId || '' },
  });
  return data;
}

export async function checkoutCart(weddingId) {
  const { data } = await api.post('/cart/checkout', {}, {
    headers: { 'X-Wedding-Id': weddingId || '' },
  });
  return data;
}

export async function getHallSlots(listingId, date) {
  const { data } = await api.get('/cart/hall-slots', { params: { listingId, date } });
  return data;
}
