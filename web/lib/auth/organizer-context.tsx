'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser } from '@/types';

const BASE = '/api';

async function organizerReq<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('organizer_token') : null;
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

export const organizerHttp = {
  get:    <T,>(path: string)                => organizerReq<T>(path),
  post:   <T,>(path: string, body: unknown) => organizerReq<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T,>(path: string, body: unknown) => organizerReq<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T,>(path: string)               => organizerReq<T>(path, { method: 'DELETE' }),
};

interface OrganizerCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const OrganizerContext = createContext<OrganizerCtx | null>(null);

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('organizer_user');
      if (saved) setUser(JSON.parse(saved));
    } catch { /* corrupted storage */ }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await organizerReq<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.user.role !== 'organizer') {
      throw new Error('Access denied. Organizer account required.');
    }
    localStorage.setItem('organizer_token', res.token);
    localStorage.setItem('organizer_user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('organizer_token');
    localStorage.removeItem('organizer_user');
    setUser(null);
  };

  return (
    <OrganizerContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </OrganizerContext.Provider>
  );
}

export function useOrganizer() {
  const ctx = useContext(OrganizerContext);
  if (!ctx) throw new Error('useOrganizer must be inside OrganizerProvider');
  return ctx;
}