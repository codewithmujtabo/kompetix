'use client';

import { useEffect, useState } from 'react';
import { adminHttp } from '@/lib/api/client';

interface Segment {
  key: string;
  label: string;
  description: string;
  count: number;
  sampleUserIds: string[];
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminHttp.get<Segment[]>('/admin/segments')
      .then(setSegments)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load segments'));
  }, []);

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <div className="fu" style={{ marginBottom: 28 }}>
        <p className="label" style={{ marginBottom: 6 }}>Audience</p>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Segments</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
          Pre-built cross-sell audiences. Use these to target broadcasts in Send Notification.
        </p>
      </div>

      {error && <div className="toast toast-err">⚠ {error}</div>}

      {!segments && !error && <p style={{ color: 'var(--text-3)' }}>Computing segments…</p>}

      {segments && (
        <div style={{ display: 'grid', gap: 12 }}>
          {segments.map((s) => (
            <div key={s.key} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {s.key}
                  </div>
                  <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 400, marginTop: 4, marginBottom: 6 }}>{s.label}</h2>
                  <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5 }}>{s.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>members</div>
                </div>
              </div>
              {s.sampleUserIds.length > 0 && (
                <details style={{ marginTop: 16 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-3)' }}>
                    Sample user IDs (first {s.sampleUserIds.length})
                  </summary>
                  <pre style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-2)', background: 'var(--bg-2)', padding: 12, borderRadius: 8, marginTop: 8, overflowX: 'auto' }}>
{s.sampleUserIds.join('\n')}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--text-3)' }}>
        Phase 2 will add a custom segment builder + scheduled recompute. Today's segments are computed on each page load.
      </p>
    </div>
  );
}
