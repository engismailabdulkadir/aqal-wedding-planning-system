import api from './api.js';

export async function getGuests(weddingId) {
  const { data } = await api.get('/guests', { params: { weddingId } });
  return data;
}

export async function createGuest(guestData, weddingId) {
  const { data } = await api.post('/guests', { ...guestData, weddingId });
  return data;
}

export async function getGuest(id) {
  const { data } = await api.get(`/guests/${id}`);
  return data;
}

export async function updateGuest(id, guestData) {
  const { data } = await api.patch(`/guests/${id}`, guestData);
  return data;
}

export async function deleteGuest(id) {
  const { data } = await api.delete(`/guests/${id}`);
  return data;
}

export async function downloadGuestTemplate() {
  const response = await api.get('/guests/template/download', { responseType: 'blob' });
  return response.data;
}

export async function previewGuestImport(file, weddingId) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/guests/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data', 'X-Wedding-Id': weddingId || '' },
    params: weddingId ? { weddingId } : undefined,
  });
  return data;
}

export async function importGuests(guests, weddingId) {
  const { data } = await api.post('/guests/import', { guests }, {
    headers: { 'X-Wedding-Id': weddingId || '' },
    params: weddingId ? { weddingId } : undefined,
  });
  return data;
}
