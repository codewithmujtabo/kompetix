'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser } from '@/types';

const BASE = '/api';

async function schoolReq<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('school_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const schoolHttp = {
  get:    <T,>(path: string) => schoolReq<T>(path),
  post:   <T,>(path: string, body: unknown) => schoolReq<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T,>(path: string, body: unknown) => schoolReq<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T,>(path: string) => schoolReq<T>(path, { method: 'DELETE' }),
};

export async function schoolFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('school_token') : null;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (t) headers['Authorization'] = `Bearer ${t}`;
  return fetch(`${BASE}${path}`, { ...init, headers });
}

interface SchoolCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const SchoolContext = createContext<SchoolCtx | null>(null);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('school_user');
      if (saved) setUser(JSON.parse(saved));
    } catch { /* corrupted storage */ }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await schoolReq<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Разрешаем вход для school_admin и teacher
    if (res.user.role !== 'school_admin' && res.user.role !== 'teacher') {
      throw new Error('Access denied. School coordinator or teacher account required.');
    }
    
    localStorage.setItem('school_token', res.token);
    localStorage.setItem('school_user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('school_token');
    localStorage.removeItem('school_user');
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