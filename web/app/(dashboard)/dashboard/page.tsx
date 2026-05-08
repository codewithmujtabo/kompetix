'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { adminHttp } from '@/lib/api/client';

interface Kpi {
  totals: {
    totalRegistrations: number;
    paidRegistrations:  number;
    freeRegistrations:  number;
    revenueRp:          number;
  };
  paidRate: number;
  avgTimeToPaymentHours: number | null;
  topCompetitions: Array<{ id: string; name: string; fee: number; registrationCount: number }>;
  dailySeries: Array<{ date: string; registrations: number; revenueRp: number }>;
}

const LINKS = [
  { href: '/registrations', icon: '📋', label: 'Registrations',     desc: 'Approve / reject pending applications' },
  { href: '/competitions',  icon: '🏆', label: 'Competitions',      desc: 'Create and manage competitions' },
  { href: '/segments',      icon: '🧩', label: 'Segments',          desc: 'Cross-sell audiences' },
  { href: '/notifications', icon: '📣', label: 'Send Notification', desc: 'Announce competitions to schools' },
  { href: '/schools',       icon: '🏫', label: 'Schools',           desc: 'View and add schools' },
  { href: '/users',         icon: '👥', label: 'Users',             desc: 'Browse registered users' },
];

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card" style={{ padding: '22px 24px' }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--ff-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--ff-display)', fontSize: 28, fontWeight: 400, marginTop: 8 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Sparkline({ values, accent = 'var(--accent)' }: { values: number[]; accent?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const w = 240;
  const h = 56;
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      <polyline fill="none" stroke={accent} strokeWidth="1.6" points={pts} />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const router   = useRouter();
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminHttp.get<Kpi>('/admin/kpi')
      .then(setKpi)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load KPIs'));
  }, []);

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      <div className="fu" style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Welcome back</p>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 38, fontWeight: 400 }}>
          {user?.full_name || 'Admin'}
        </h1>
      </div>

      {error && <div className="toast toast-err" style={{ marginBottom: 20 }}>⚠ {error}</div>}

      {kpi && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Registrations" value={String(kpi.totals.totalRegistrations)} hint={`${kpi.totals.freeRegistrations} free`} />
            <StatCard label="Paid Rate"     value={`${(kpi.paidRate * 100).toFixed(1)}%`} hint={`${kpi.totals.paidRegistrations} paid`} />
            <StatCard label="Revenue (90d)" value={fmtRp(kpi.totals.revenueRp)} />
            <StatCard
              label="Avg Time to Pay"
              value={kpi.avgTimeToPaymentHours != null ? `${kpi.avgTimeToPaymentHours.toFixed(1)} h` : '—'}
              hint="Registration → settlement"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 28 }}>
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--ff-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Last 90 days · Registrations</div>
              <Sparkline values={kpi.dailySeries.map((d) => d.registrations)} />
            </div>
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--ff-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Top 3 (90d)</div>
              {kpi.topCompetitions.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No data yet</div>
                : kpi.topCompetitions.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.name}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{c.registrationCount}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {LINKS.map(l => (
          <div
            key={l.href}
            className="card"
            onClick={() => router.push(l.href)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', transition: 'all var(--ease)' }}
            onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'var(--border-light)'; d.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'var(--border)'; d.style.transform = 'none'; }}
          >
            <span style={{ fontSize: 22 }}>{l.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{l.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{l.desc}</div>
            </div>
            <span style={{ color: 'var(--text-3)' }}>→</span>
          </div>
        ))}
      </div>
    </div>
  );
}
