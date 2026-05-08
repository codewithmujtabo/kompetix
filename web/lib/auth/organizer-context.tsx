'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { organizerHttp } from '@/lib/api/client';
import type { AuthUser } from '@/types';

// Re-export for components that imported organizerHttp from this file historically.
export { organizerHttp } from '@/lib/api/client';

interface OrganizerCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const OrganizerContext = createContext<OrganizerCtx | null>(null);

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const me = await organizerHttp.get<AuthUser>('/auth/me');
      if (me.role === 'organizer') setUser(me);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void hydrate(); }, [hydrate]);

  const login = async (email: string, password: string) => {
    const res = await organizerHttp.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    if (res.user.role !== 'organizer') {
      await organizerHttp.post('/auth/logout', {}).catch(() => {});
      throw new Error('Access denied. Organizer account required.');
    }
    setUser(res.user);
  };

  const logout = async () => {
    await organizerHttp.post('/auth/logout', {}).catch(() => {});
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
