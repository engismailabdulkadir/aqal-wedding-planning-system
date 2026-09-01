import api from './api.js';
import { ROLES } from '../utils/roles.js';

// Roles-ka user-ka caadiga ah uu iska dooran karo marka uu register sameynayo
const PUBLIC_ROLE_VALUES = new Set([
  ROLES.GROOM,
  ROLES.BRIDE,
  ROLES.WEDDING_PLANNER,
  ROLES.VENDOR,
]);

/**
 * Role-ka registration-ka u beddel qaabka system-ku fahmayo.
 *
 * Tusaale:
 * planner -> wedding_planner
 *
 * Haddii role aan la aqoon la soo diro,
 * default ahaan Groom ayaa loo isticmaalaa.
 */
export function normalizeRegistrationRole(value) {
  const raw = String(value ?? ROLES.GROOM).trim().toLowerCase();

  if (raw === 'planner') return ROLES.WEDDING_PLANNER;

  if (PUBLIC_ROLE_VALUES.has(raw)) return raw;

  return ROLES.GROOM;
}

/**
 * Samee payload-ka loo dirayo backend-ka marka user cusub la sameynayo.
 */
export function buildRegisterPayload(form) {
  // Hel role-ka user-ka
  const role = normalizeRegistrationRole(
    form.role ?? form.account_type
  );

  // Xogta muhiimka ah ee registration-ka
  const payload = {
    firstName: String(form.firstName || '').trim(),
    lastName: String(form.lastName || '').trim(),
    username: String(form.username || '').trim(),
    phone: String(form.phone || '').trim(),
    password: form.password,
    role,
  };

  // Email-ku waa optional, sidaas darteed kaliya ku dar haddii la buuxiyay
  const email = String(form.email || '').trim();

  if (email) payload.email = email;

  return payload;
}

// API request loogu sameynayo user cusub
export async function register(userData) {
  // Haddii role jiro, normalize garee
  const payload = userData.role
    ? {
        ...userData,
        role: normalizeRegistrationRole(userData.role),
      }
    : buildRegisterPayload(userData);

  // Backend-ka u dir registration request
  const { data } = await api.post('/auth/register', payload);

  return data;
}

// API request login
export async function login(credentials) {
  const { data } = await api.post('/auth/login', credentials);

  return data;
}

// Hel user-ka hadda login-ka ku jira
export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');

  return data;
}

// Logout request
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Haddii server-ku error sameeyo,
    // client-ka ayaa weli session-ka tirtiraya
  }
}