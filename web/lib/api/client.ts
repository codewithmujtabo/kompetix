// lib/api/client.ts
const BASE = '/api';

// Для админа
function adminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function adminReq<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = adminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const adminHttp = {
  get:    <T>(path: string) => adminReq<T>(path),
  post:   <T>(path: string, body: unknown) => adminReq<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => adminReq<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => adminReq<T>(path, { method: 'DELETE' }),
};

// Для организатора
function organizerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('organizer_token');
}

async function organizerReq<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = organizerToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function organizerFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = organizerToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const organizerHttp = {
  get:          <T>(path: string) => organizerReq<T>(path),
  post:         <T>(path: string, body: unknown) => organizerReq<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:          <T>(path: string, body: unknown) => organizerReq<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete:       <T>(path: string) => organizerReq<T>(path, { method: 'DELETE' }),
  postFormData: <T>(path: string, formData: FormData) => organizerFormData<T>(path, formData),
};