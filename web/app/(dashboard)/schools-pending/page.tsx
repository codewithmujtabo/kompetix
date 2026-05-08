'use client';

import { useEffect, useState } from 'react';
import { adminHttp } from '@/lib/api/client';

interface PendingSchool {
  id: string;
  npsn: string;
  name: string;
  city: string | null;
  province: string | null;
  address: string | null;
  verificationStatus: 'pending_verification' | 'rejected';
  verificationLetterUrl: string | null;
  appliedAt: string | null;
  rejectionReason: string | null;
  applicant: { id: string; name: string; email: string; phone: string | null } | null;
}

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pending_verification: { cls: 'badge-yellow', label: 'Pending' },
  rejected:             { cls: 'badge-red',    label: 'Rejected' },
};

export default function SchoolsPendingPage() {
  const [schools, setSchools] = useState<PendingSchool[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await adminHttp.get<PendingSchool[]>('/admin/schools/pending');
      setSchools(r);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
  };

  useEffect(() => { void load(); }, []);

  const verify = async (s: PendingSchool) => {
    setBusyId(s.id);
    try {
      await adminHttp.post(`/admin/schools/${s.id}/verify`, {});
      setMsg({ ok: true, text: `Verified ${s.name}` });
      await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusyId(null); }
  };

  const reject = async (s: PendingSchool) => {
    const reason = window.prompt(`Reject ${s.name}? Provide a reason (sent to the coordinator):`);
    if (!reason || !reason.trim()) return;
    setBusyId(s.id);
    try {
      await adminHttp.post(`/admin/schools/${s.id}/reject`, { reason });
      setMsg({ ok: true, text: `Rejected ${s.name}` });
      await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1200 }}>
      <div className="fu" style={{ marginBottom: 28 }}>
        <p className="label" style={{ marginBottom: 6 }}>Verification Queue</p>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>School Applications</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
          Approve schools so their coordinator can access the school portal (bulk registration, bulk payment, reports).
        </p>
      </div>

      {error && <div className="toast toast-err" style={{ marginBottom: 16 }}>⚠ {error}</div>}
      {msg && <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`} style={{ marginBottom: 16 }}>{msg.ok ? '✓' : '⚠'} {msg.text}</div>}

      {!schools && !error && <p style={{ color: 'var(--text-3)' }}>Loading…</p>}
      {schools && schools.length === 0 && <p style={{ color: 'var(--text-3)' }}>No pending schools.</p>}

      {schools && schools.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--bg-2)' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>School</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>NPSN</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Coordinator</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Letter</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => {
                const badge = STATUS_BADGE[s.verificationStatus];
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {[s.city, s.province].filter(Boolean).join(', ') || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--ff-mono)' }}>{s.npsn}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {s.applicant ? (
                        <>
                          <div>{s.applicant.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.applicant.email}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {s.verificationLetterUrl
                        ? <a href={s.verificationLetterUrl} target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>View ↗</a>
                        : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      {s.rejectionReason && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                          {s.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {s.verificationStatus === 'pending_verification' ? (
                        <>
                          <button
                            className="btn btn-ghost"
                            disabled={busyId === s.id}
                            onClick={() => reject(s)}
                            style={{ marginRight: 6, color: '#ef4444' }}
                          >
                            Reject
                          </button>
                          <button
                            className="btn btn-primary"
                            disabled={busyId === s.id}
                            onClick={() => verify(s)}
                            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none' }}
                          >
                            Verify
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          disabled={busyId === s.id}
                          onClick={() => verify(s)}
                          title="Reset rejection and re-approve"
                        >
                          Re-verify
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
