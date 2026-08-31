import api from './api.js';
import { ROLES } from '../utils/roles.js';

const PUBLIC_ROLE_VALUES = new Set([
  ROLES.GROOM,
  ROLES.BRIDE,
  ROLES.WEDDING_PLANNER,
  ROLES.VENDOR,
]);

/**
 * Normalize registration role before sending to API.
 * Field name is `role` (canonical across the app).
 */
export function normalizeRegistrationRole(value) {
  const raw = String(value ?? ROLES.GROOM).trim().toLowerCase();
  if (raw === 'planner') return ROLES.WEDDING_PLANNER;
  if (PUBLIC_ROLE_VALUES.has(raw)) return raw;
  return ROLES.GROOM;
}

export function buildRegisterPayload(form) {
  const role = normalizeRegistrationRole(form.role ?? form.account_type);
  const payload = {
    firstName: String(form.firstName || '').trim(),
    lastName: String(form.lastName || '').trim(),
    username: String(form.username || '').trim(),
    phone: String(form.phone || '').trim(),
    password: form.password,
    role,
  };
  const email = String(form.email || '').trim();
  if (email) payload.email = email;
  return payload;
}

export async function register(userData) {
  const payload = userData.role
    ? { ...userData, role: normalizeRegistrationRole(userData.role) }
    : buildRegisterPayload(userData);
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function login(credentials) {
  const { data } = await api.post('/auth/login', credentials);
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Session cleared client-side regardless
  }
}
