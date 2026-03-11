const BASE = '/api';

function adminHeaders() {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function userHeaders() {
  const token = localStorage.getItem('user_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...adminHeaders(), ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export async function userFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...userHeaders(), ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export async function apiFormData(path, formData, method = 'POST') {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: adminHeaders(),
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// Événements publics
export const getPublicEvents = () => userFetch('/events');

// Inscriptions (utilisateur connecté)
export const registerForEvent = (eventId) =>
  userFetch(`/registrations/${eventId}`, { method: 'POST' });
export const getMyRegistrations = () => userFetch('/registrations/user/me');

// Comptes utilisateurs
export const createAccount = (body) =>
  userFetch('/users/register', { method: 'POST', body: JSON.stringify(body) });
export const loginUser = (body) =>
  userFetch('/users/login', { method: 'POST', body: JSON.stringify(body) });

export function isUserLoggedIn() {
  return !!localStorage.getItem('user_token');
}
export function getUser() {
  try {
    const token = localStorage.getItem('user_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { first_name: payload.first_name, last_name: payload.last_name, id: payload.id };
  } catch { return null; }
}
export function logoutUser() {
  localStorage.removeItem('user_token');
}

// Admin - Événements
export const getAllEvents = () => apiFetch('/admin/events/all');
export const getEventStats = () => apiFetch('/events/stats');
export const createEvent = (formData) => apiFormData('/admin/events', formData);
export const updateEvent = (id, formData) => apiFormData(`/admin/events/${id}`, formData, 'PUT');
export const deleteEvent = (id) => apiFetch(`/admin/events/${id}`, { method: 'DELETE' });

// Admin - Inscriptions
export const getRegistrations = (eventId) => apiFetch(`/admin/registrations/${eventId}`);
export const addRegistration = (eventId, body) =>
  apiFetch(`/admin/registrations/${eventId}/admin`, { method: 'POST', body: JSON.stringify(body) });
export const updateRegistrationStatus = (id, status) =>
  apiFetch(`/admin/registrations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
export const deleteRegistration = (id) =>
  apiFetch(`/admin/registrations/${id}`, { method: 'DELETE' });

// Auth admin
export const login = (username, password) =>
  apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const changePassword = (old_password, new_password) =>
  apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ old_password, new_password }) });

export function isLoggedIn() {
  return !!localStorage.getItem('admin_token');
}
export function logout() {
  localStorage.removeItem('admin_token');
}
