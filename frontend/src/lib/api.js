import { API } from './data';

let refreshing;
export const formatError = (detail) => Array.isArray(detail) ? detail.map((e) => e.msg).join(' ') : typeof detail === 'string' ? detail : 'Something went wrong. Please try again.';

export async function apiRequest(path, options = {}, retry = true) {
  const { body, ...rest } = options;
  const binary = body instanceof Blob;
  const token = sessionStorage.getItem('naj_owner_token') || localStorage.getItem('naj_customer_token');
  const response = await fetch(`${API}${path}`, {
    credentials: 'include', ...rest,
    headers: {
      'X-CSRF-Protection': '1',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(body && !binary ? { 'Content-Type': 'application/json' } : {}),
      ...rest.headers
    },
    ...(body ? { body: binary ? body : JSON.stringify(body) } : {}),
  });
  const secured = path.startsWith('/admin/') || path === '/auth/me';
  if (response.status === 401 && secured && retry) {
    if (!refreshing) refreshing = apiRequest('/auth/refresh', { method: 'POST' }, false).finally(() => { refreshing = null; });
    try {
      const refreshed = await refreshing;
      if (refreshed?.access_token) {
        sessionStorage.setItem('naj_owner_token', refreshed.access_token);
      }
      return await apiRequest(path, options, false);
    }
    catch (error) {
      if (error.status === 401) {
        sessionStorage.removeItem('naj_owner_token');
        window.dispatchEvent(new Event('owner-session-expired'));
      }
      throw error;
    }
  }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && secured) {
      sessionStorage.removeItem('naj_owner_token');
      window.dispatchEvent(new Event('owner-session-expired'));
    }
    const error = new Error(formatError(data.detail)); error.status = response.status; throw error;
  }
  if (data?.access_token) {
    if (data.role === 'owner') {
      sessionStorage.setItem('naj_owner_token', data.access_token);
    } else {
      localStorage.setItem('naj_customer_token', data.access_token);
    }
  }
  return data;
}

export const publishChange = (type = 'catalog') => {
  const channel = new BroadcastChannel('naj-store'); channel.postMessage(type); channel.close();
  window.dispatchEvent(new CustomEvent('naj-store-change', { detail: type }));
};
