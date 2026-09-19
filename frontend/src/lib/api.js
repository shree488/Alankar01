import { API } from './data';

let refreshing;
export const formatError = (detail) => Array.isArray(detail) ? detail.map((e) => e.msg).join(' ') : typeof detail === 'string' ? detail : 'Something went wrong. Please try again.';

export async function apiRequest(path, options = {}, retry = true) {
  const { body, ...rest } = options;
  const binary = body instanceof Blob;
  const response = await fetch(`${API}${path}`, {
    credentials: 'include', ...rest,
    headers: { 'X-CSRF-Protection': '1', ...(body && !binary ? { 'Content-Type': 'application/json' } : {}), ...rest.headers },
    ...(body ? { body: binary ? body : JSON.stringify(body) } : {}),
  });
  const secured = path.startsWith('/admin/') || path === '/auth/me';
  if (response.status === 401 && secured && retry) {
    if (!refreshing) refreshing = apiRequest('/auth/refresh', { method: 'POST' }, false).finally(() => { refreshing = null; });
    try { await refreshing; return await apiRequest(path, options, false); }
    catch (error) { if (error.status === 401) window.dispatchEvent(new Event('owner-session-expired')); throw error; }
  }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && secured) window.dispatchEvent(new Event('owner-session-expired'));
    const error = new Error(formatError(data.detail)); error.status = response.status; throw error;
  }
  return data;
}

export const publishChange = (type = 'catalog') => {
  const channel = new BroadcastChannel('naj-store'); channel.postMessage(type); channel.close();
  window.dispatchEvent(new CustomEvent('naj-store-change', { detail: type }));
};
