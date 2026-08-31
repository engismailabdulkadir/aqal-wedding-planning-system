import api from './api.js';

export async function getMyWedding() {
  const { data } = await api.get('/weddings/my-wedding');
  return data;
}

export async function getWeddings() { const { data } = await api.get('/weddings'); return data; }
export async function getWedding(id) { const { data } = await api.get(`/weddings/${id}`); return data; }
export async function getWeddingOverview(id) {
  const { data } = await api.get(`/weddings/${id}/overview`);
  return data;
}

export async function getWeddingManagement(id) {
  const { data } = await api.get(`/weddings/${id}/management`);
  return data;
}

export async function createWedding(weddingData) {
  const { data } = await api.post('/weddings', weddingData);
  return data;
}

export async function updateWedding(id, weddingData) {
  const { data } = await api.put(`/weddings/${id}`, weddingData);
  return data;
}
