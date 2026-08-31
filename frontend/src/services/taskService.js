import api from './api.js';

export async function getTasks(weddingId) { const { data } = await api.get('/tasks', { params: { weddingId } }); return data; }
export async function createTask(taskData, weddingId) { const { data } = await api.post('/tasks', { ...taskData, weddingId }); return data; }
export async function getTask(id) { const { data } = await api.get(`/tasks/${id}`); return data; }
export async function updateTask(id, taskData) { const { data } = await api.patch(`/tasks/${id}`, taskData); return data; }
export async function deleteTask(id) { const { data } = await api.delete(`/tasks/${id}`); return data; }
