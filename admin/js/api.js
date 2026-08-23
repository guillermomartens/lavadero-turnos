const API = '/api';

function getToken() { return localStorage.getItem('admin_token'); }
function setToken(t) { localStorage.setItem('admin_token', t); }
function clearToken() { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); }
function getUser() { try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return null; } }
function setUser(u) { localStorage.setItem('admin_user', JSON.stringify(u)); }

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API + path, { ...opts, headers });

  if (res.status === 401) {
    clearToken();
    location.reload();
    throw new Error('Sesión expirada.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de conexión.');
  return data;
}
