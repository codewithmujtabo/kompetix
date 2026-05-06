'use client';

import { useState, useEffect } from 'react';
import { useSchool, schoolHttp } from '@/lib/auth/school-context';

interface SchoolInfo {
  id: string;
  npsn: string;
  name: string;
  city: string;
  province: string;
  studentCount: number;
}

interface Stats {
  total_students: number;
  active_registrations: number;
  pending_registrations: number;
  approved_registrations: number;
}

interface TeacherStats {
  totalStudents: number;
  totalRegistrations: number;
  confirmedRegistrations: number;
  activeStudents: number;
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
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

// Навигация для администратора
const ADMIN_QUICK_LINKS = [
  { href: '/school-students',       icon: '👨‍🎓', label: 'Student Roster',    desc: 'View and manage your students' },
  { href: '/bulk-registration',     icon: '📋', label: 'Bulk Registration',   desc: 'Register multiple students at once' },
  { href: '/school-registrations',  icon: '📊', label: 'Registrations',       desc: 'Track all student registrations' },
  { href: '/bulk-payment',          icon: '💳', label: 'Bulk Payment',        desc: 'Pay for multiple registrations' },
];

// Навигация для учителя
const TEACHER_QUICK_LINKS = [
  { href: '/school-my-students',    icon: '👨‍🎓', label: 'My Students',       desc: 'View your students' },
  { href: '/school-my-competitions', icon: '🏆', label: 'My Competitions',    desc: 'Competitions your students joined' },
  { href: '/school-registrations',  icon: '📊', label: 'Registrations',       desc: 'Track registrations' },
  { href: '/school-deadlines',      icon: '⏰', label: 'Deadlines',           desc: 'Upcoming deadlines' },
];

export default function SchoolDashboard() {
  const { user } = useSchool();
  const [school, setSchool]   = useState<SchoolInfo | null>(null);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'school_admin';
  const quickLinks = isAdmin ? ADMIN_QUICK_LINKS : TEACHER_QUICK_LINKS;

  useEffect(() => {
    if (!user) return;

    if (isAdmin) {
      // Запросы для администратора
      Promise.all([
        schoolHttp.get<SchoolInfo>('/schools/my-school').catch(() => null),
        schoolHttp.get<{ students: unknown[]; pagination: { total: number } }>('/schools/students?limit=1').catch(() => ({ students: [], pagination: { total: 0 } })),
        schoolHttp.get<{ registrations: { status: string }[] }>('/schools/registrations?limit=500').catch(() => ({ registrations: [] })),
      ]).then(([schoolData, studentsData, regsData]) => {
        if (schoolData) setSchool(schoolData);
        const regs = regsData?.registrations || [];
        setStats({
          total_students:        schoolData?.studentCount || 0,
          active_registrations:  regs.length,
          pending_registrations: regs.filter(r => r.status === 'submitted' || r.status === 'pending').length,
          approved_registrations: regs.filter(r => r.status === 'approved' || r.status === 'paid').length,
        });
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      // Запросы для учителя
      Promise.all([
        schoolHttp.get<TeacherStats>('/teachers/dashboard-summary').catch(() => null),
        schoolHttp.get<{ students: unknown[] }>('/teachers/my-students').catch(() => ({ students: [] })),
      ]).then(([summaryData, studentsData]) => {
        if (summaryData) setTeacherStats(summaryData);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="card" style={{ padding: 20, height: 90, background: 'var(--bg-elevated)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      {/* Header */}
      <div className="fu" style={{ marginBottom: 36 }}>
        <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Welcome back</p>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 36, fontWeight: 400 }}>
          {user?.full_name} <span style={{ color: isAdmin ? '#3b82f6' : '#22c55e' }}>✦</span>
        </h1>
        {isAdmin && school && (
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 6 }}>
            {school.name} — {school.city}, {school.province}
          </p>
        )}
      </div>

      {/* Stats */}
      {isAdmin && stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Total Students"       value={stats.total_students}        icon="👨‍🎓" color="#3b82f6" />
          <StatCard label="Active Registrations" value={stats.active_registrations}  icon="📋" color="#6366f1" />
          <StatCard label="Pending Review"       value={stats.pending_registrations} icon="⏳" color="#f59e0b" />
          <StatCard label="Approved"             value={stats.approved_registrations} icon="✅" color="#22c55e" />
        </div>
      ) : teacherStats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="My Students"       value={teacherStats.totalStudents}        icon="👨‍🎓" color="#22c55e" />
          <StatCard label="Registrations"     value={teacherStats.totalRegistrations}   icon="📋" color="#22c55e" />
          <StatCard label="Confirmed"         value={teacherStats.confirmedRegistrations} icon="✅" color="#22c55e" />
          <StatCard label="Active (30d)"      value={teacherStats.activeStudents}       icon="⭐" color="#22c55e" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="card" style={{ padding: 20, height: 90 }} />)}
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {quickLinks.map(l => (
          <a key={l.href} href={l.href} style={{ textDecoration: 'none' }}>
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
          </a>
        ))}
      </div>
    </div>
  );
}