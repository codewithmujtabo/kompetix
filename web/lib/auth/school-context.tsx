'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser } from '@/types';

const BASE = '/api';

// Cookie auth: every request sends credentials. Tokens are no longer
// kept anywhere on the client — the httpOnly cookie set by the backend
// is the entire session.
async function schoolReq<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const schoolHttp = {
  get:    <T,>(path: string)                  => schoolReq<T>(path),
  post:   <T,>(path: string, body: unknown)   => schoolReq<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T,>(path: string, body: unknown)   => schoolReq<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T,>(path: string)                  => schoolReq<T>(path, { method: 'DELETE' }),
};

// Used by callers that need the raw Response (e.g. CSV downloads).
export async function schoolFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, { ...init, credentials: 'include' });
}

interface SchoolCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const SchoolContext = createContext<SchoolCtx | null>(null);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const me = await schoolReq<AuthUser>('/auth/me');
      if (me.role === 'school_admin' || me.role === 'teacher') setUser(me);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void hydrate(); }, [hydrate]);

  const login = async (email: string, password: string) => {
    const res = await schoolReq<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    });
    if (res.user.role !== 'school_admin' && res.user.role !== 'teacher') {
      await schoolReq('/auth/logout', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
      throw new Error('Access denied. School coordinator or teacher account required.');
    }
    setUser(res.user);
  };

  const logout = async () => {
    await schoolReq('/auth/logout', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
    setUser(null);
  };

  return (
    <SchoolContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be inside SchoolProvider');
  return ctx;
}
