'use client';

export function PageHeader({ sub, title, count }: { sub: string; title: string; count?: number }) {
  return (
    <div className="fu" style={{ marginBottom: 28 }}>
      <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{sub}</p>
      <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>{title}</h1>
      {count !== undefined && <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{count.toLocaleString()} records</p>}
    </div>
  );
}

export function Spinner() {
  return <span className="spin" />;
}

export function Toast({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`toast fi ${ok ? 'toast-ok' : 'toast-err'}`} style={{ marginBottom: 16 }}>
      {ok ? '✓' : '⚠'} {msg}
    </div>
  );
}

export function Pager({ page, total, limit, onChange }: {
  page: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
      <button className="btn btn-ghost" onClick={() => onChange(page - 1)} disabled={page === 1} style={{ padding: '5px 11px' }}>←</button>
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)' }}>{page} / {pages}</span>
      <button className="btn btn-ghost" onClick={() => onChange(page + 1)} disabled={page >= pages} style={{ padding: '5px 11px' }}>→</button>
    </div>
  );
}
