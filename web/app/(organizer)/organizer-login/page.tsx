'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizer } from '@/lib/auth/organizer-context';
import { Spinner } from '@/components/ui';
import Link from 'next/link';

export default function OrganizerLogin() {
  const { login, user, loading } = useOrganizer();
  const router                   = useRouter();
  const [email, setEmail]        = useState('');
  const [password, setPassword]  = useState('');
  const [error, setError]        = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/organizer-dashboard');
  }, [user, loading, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/organizer-dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse at 60% 20%,rgba(99,102,241,.07) 0%,transparent 60%),var(--bg)' }}>
      <button onClick={() => router.replace('/')} style={{ position: 'fixed', top: 20, left: 20, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border-light)', borderRadius: 8, padding: '7px 14px', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' }}>
        ← Back
      </button>
      <div className="fu" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 18, boxShadow: '0 0 28px rgba(245,158,11,.2)' }}>🏆</div>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 26, fontWeight: 400, marginBottom: 4 }}>Competzy</h1>
          <p style={{ color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>Organizer Portal</p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="organizer@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div className="toast toast-err fi">⚠ {error}</div>}
            <button className="btn btn-primary" type="submit" disabled={submitting}
              style={{ justifyContent: 'center', padding: '11px', marginTop: 4, fontSize: 14, background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
              {submitting ? <Spinner /> : '→'}&nbsp;Sign in
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-3)' }}>
          Admin?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in here</Link>
        </p>
      </div>
    </div>
  );
}