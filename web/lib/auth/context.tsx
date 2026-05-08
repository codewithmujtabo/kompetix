'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { adminHttp } from '@/lib/api/client';
import type { AuthUser } from '@/types';

interface AuthCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from /me on mount. Cookie auth means we always need a network
  // round-trip to know who the user is — there's no longer a token in
  // localStorage we can trust.
  const hydrate = useCallback(async () => {
    try {
      const me = await adminHttp.get<AuthUser>('/auth/me');
      // Admin portal only accepts admin users.
      if (me.role === 'admin') setUser(me);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void hydrate(); }, [hydrate]);

  const login = async (email: string, password: string) => {
    const res = await adminHttp.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    if (res.user.role !== 'admin') {
      // Backend already set the cookie; clear it before we throw so the user
      // isn't left in a half-authenticated state.
      await adminHttp.post('/auth/logout', {}).catch(() => {});
      throw new Error('Access denied. Admin account required.');
    }
    setUser(res.user);
  };

  const logout = async () => {
    await adminHttp.post('/auth/logout', {}).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
