'use client';

import { useState, useEffect } from 'react';
import { organizerHttp } from '@/lib/auth/organizer-context';

interface RevenueData {
  totalRegistrations: number;
  paidRegistrations: number;
  totalRevenue: number;
  competitions: { id: string; name: string; registrations: number; revenue: number }[];
}

function Spinner() { return <span className="spin" />; }

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 28, fontFamily: 'var(--ff-display)', color: 'var(--text-1)' }}>{value}</p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Revenue() {
  const [data, setData]       = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState<string | null>(null);

  useEffect(() => {
    organizerHttp.get<RevenueData>('/organizers/revenue')
      .then(setData)
      .catch(e => setMsg((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <div className="fu" style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Overview</p>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Revenue</h1>
      </div>

      {msg && <div className="toast toast-err fi" style={{ marginBottom: 20 }}>⚠ {msg}</div>}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 20, height: 90, background: 'var(--bg-elevated)' }} />
          ))}
        </div>
      ) : data ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            <StatCard label="Total Revenue"      value={fmt(data.totalRevenue)}      icon="💰" color="#f59e0b" />
            <StatCard label="Paid Registrations" value={data.paidRegistrations}      icon="✅" color="#22c55e" />
            <StatCard label="Total Registrations" value={data.totalRegistrations}    icon="📝" color="#6366f1" />
          </div>

          <div>
            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>
              Per Competition
            </p>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {data.competitions.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No competitions yet
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Competition</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Registrations</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Revenue</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.competitions.map(c => {
                      const share = data.totalRevenue > 0
                        ? Math.round((c.revenue / data.totalRevenue) * 100)
                        : 0;
                      return (
                        <tr key={c.id}>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-1)', fontWeight: 500 }}>
                            {c.name}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', textAlign: 'right', fontFamily: 'var(--ff-mono)', fontSize: 13 }}>
                            {c.registrations}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', textAlign: 'right', fontFamily: 'var(--ff-mono)', fontSize: 13 }}>
                            {c.revenue > 0 ? fmt(c.revenue) : <span className="badge badge-green">Free</span>}
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                              <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                <div style={{ width: `${share}%`, height: '100%', background: '#f59e0b', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', minWidth: 32 }}>
                                {share}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
