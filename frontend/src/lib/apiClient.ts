// API_BASE is intentionally empty so all /api/* calls are relative URLs.
// On Vercel (production): Next.js rewrites /api/* → https://vc-scope-os.onrender.com/api/*
//   — server-to-server, no CORS issues.
// In local dev: Next.js dev server rewrites /api/* → http://127.0.0.1:8000/api/*
//   — via BACKEND_URL in .env.local
const API_BASE = '';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${path}`;

  const headers = new Headers(options.headers || {});

  // Attach JWT token if present
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vc_os_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: options.cache || 'no-store',
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vc_os_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (_e) {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
