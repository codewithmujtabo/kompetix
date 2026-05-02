'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Spinner } from '@/components/ui';

export default function Login() {
  const { login, user, loading } = useAuth();
  const router                   = useRouter();
  const [email, setEmail]        = useState('admin@eduversal.com');
  const [password, setPassword]  = useState('');
  const [error, setError]        = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse at 60% 20%,rgba(99,102,241,.07) 0%,transparent 60%),var(--bg)' }}>
      <div className="fu" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: 'linear-gradient(135deg,var(--accent),#818cf8)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 18, boxShadow: '0 0 28px var(--accent-dim)' }}>✦</div>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 26, fontWeight: 400, marginBottom: 4 }}>Kompetix</h1>
          <p style={{ color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>Admin Portal</p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div className="toast toast-err fi">⚠ {error}</div>}
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ justifyContent: 'center', padding: '11px', marginTop: 4, fontSize: 14 }}>
              {submitting ? <Spinner /> : '→'}&nbsp;Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
