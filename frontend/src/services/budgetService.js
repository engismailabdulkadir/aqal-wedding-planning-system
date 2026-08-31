import api from './api.js';

export async function getBudget(weddingId) {
  const { data } = await api.get('/budget', { params: { weddingId } });
  return data;
}

export async function createBudgetItem(itemData, weddingId) {
  const { data } = await api.post('/budget', { ...itemData, weddingId });
  return data;
}

export async function updateBudgetItem(id, itemData) {
  const { data } = await api.patch(`/budget/${id}`, itemData);
  return data;
}

export async function deleteBudgetItem(id) {
  const { data } = await api.delete(`/budget/${id}`);
  return data;
}
