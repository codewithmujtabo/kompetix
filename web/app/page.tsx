'use client';

import Link from 'next/link';

const ROLES = [
  {
    key: 'admin',
    icon: '🛡️',
    label: 'Admin',
    desc: 'Manage competitions, users, schools, and approvals',
    href: '/login',
    color: '#6366f1',
    disabled: false,
  },
  {
    key: 'organizer',
    icon: '🏆',
    label: 'Organizer',
    desc: 'Manage your competitions and view participants',
    href: '/organizer-login',
    color: '#f59e0b',
    disabled: false,
  },
  {
    key: 'teacher',
    icon: '📚',
    label: 'Teacher',
    desc: 'View your students and their competition results',
    href: '#',
    color: '#22c55e',
    disabled: true,
  },
];

export default function RoleSelector() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 50% 0%,rgba(99,102,241,.08) 0%,transparent 60%),var(--bg)',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg,#6366f1,#818cf8)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, marginBottom: 20,
          boxShadow: '0 0 36px rgba(99,102,241,.25)',
        }}>✦</div>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400, marginBottom: 6 }}>
          Kompetix
        </h1>
        <p style={{ color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Web Portal
        </p>
      </div>

      {/* Prompt */}
      <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 28, fontWeight: 500 }}>
        Sign in as
      </p>

      {/* Role cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 760 }}>
        {ROLES.map(r => {
          const card = (
            <div
              style={{
                width: 210,
                padding: '28px 24px',
                borderRadius: 16,
                background: 'var(--bg-card)',
                border: `1px solid ${r.disabled ? 'var(--border)' : 'var(--border)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                cursor: r.disabled ? 'not-allowed' : 'pointer',
                opacity: r.disabled ? 0.5 : 1,
                transition: 'all var(--ease)',
                textDecoration: 'none',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (r.disabled) return;
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = r.color + '60';
                el.style.transform = 'translateY(-4px)';
                el.style.boxShadow = `0 8px 32px ${r.color}18`;
              }}
              onMouseLeave={e => {
                if (r.disabled) return;
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'var(--border)';
                el.style.transform = 'none';
                el.style.boxShadow = 'none';
              }}
            >
              {r.disabled && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  fontSize: 9, fontFamily: 'var(--ff-mono)', letterSpacing: '.08em',
                  textTransform: 'uppercase', color: 'var(--text-3)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '2px 6px',
                }}>
                  Coming Soon
                </div>
              )}
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: r.color + '18',
                border: `1px solid ${r.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>
                {r.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>{r.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>{r.desc}</div>
              {!r.disabled && (
                <div style={{ fontSize: 12, color: r.color, marginTop: 4, fontWeight: 500 }}>
                  Sign in →
                </div>
              )}
            </div>
          );

          return r.disabled ? (
            <div key={r.key}>{card}</div>
          ) : (
            <Link key={r.key} href={r.href} style={{ textDecoration: 'none' }}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
