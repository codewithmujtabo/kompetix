'use client';

import { useState, useEffect } from 'react';
import { organizerHttp } from '@/lib/auth/organizer-context';
import { useOrganizer } from '@/lib/auth/organizer-context';
import Link from 'next/link';

interface Stats {
  total_competitions: number;
  total_registrations: number;
  revenue_this_month: number;
  active_competitions: number;
}

interface Competition {
  id: string;
  name: string;
  registrationStatus: string;
  registrationCount: number;
  regCloseDate?: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

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

export default function OrganizerDashboard() {
  const { user } = useOrganizer();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      organizerHttp.get<{
        totalRegistrations: number;
        paidRegistrations: number;
        totalRevenue: number;
        competitions: { id: string; name: string; registrations: number; revenue: number }[];
      }>('/organizers/revenue'),
      organizerHttp.get<Competition[]>('/organizers/competitions'),
    ]).then(([revenue, comps]) => {
      setStats({
        total_competitions:  comps.length,
        total_registrations: revenue.totalRegistrations,
        revenue_this_month:  revenue.totalRevenue,
        active_competitions: comps.filter(c => c.registrationStatus === 'Open').length,
      });
      setActivity(comps.slice(0, 5).map(c => ({
        id: c.id,
        type: 'competition',
        description: `Competition "${c.name}" — ${c.registrationCount} registrations`,
        created_at: c.regCloseDate || new Date().toISOString(),
      })));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <div className="fu" style={{ marginBottom: 36 }}>
        <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Welcome back</p>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 36, fontWeight: 400 }}>
          {user?.full_name || 'Organizer'}
        </h1>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 20, height: 90, background: 'var(--bg-elevated)' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Competitions"       value={stats?.total_competitions  ?? 0} icon="🏆" color="#6366f1" />
          <StatCard label="Registrations"      value={stats?.total_registrations ?? 0} icon="📝" color="#22c55e" />
          <StatCard label="Revenue This Month" value={formatCurrency(stats?.revenue_this_month ?? 0)} icon="💰" color="#f59e0b" />
          <StatCard label="Active Now"         value={stats?.active_competitions ?? 0} icon="🔥" color="#ef4444" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {[
          { href: '/organizer-competitions', icon: '🏆', label: 'Manage Competitions', desc: 'View, create, and edit competitions' },
          { href: '/participants', icon: '👥', label: 'View Participants',   desc: 'Browse registered participants' },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 22px', cursor: 'pointer', transition: 'all var(--ease)' }}
              onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'var(--border-light)'; d.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'var(--border)'; d.style.transform = 'none'; }}>
              <span style={{ fontSize: 26 }}>{l.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{l.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{l.desc}</div>
              </div>
              <span style={{ color: 'var(--text-3)' }}>→</span>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>Recent Activity</p>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {activity.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No recent activity</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activity.map((a, i) => (
                <div key={a.id} style={{ padding: '14px 20px', borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}