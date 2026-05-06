'use client';

import { useState, useEffect } from 'react';
import { organizerHttp } from '@/lib/auth/organizer-context';

interface Competition { id: string; name: string; registrationCount: number; }
interface Registration {
  id: string;
  status: string;
  registrationNumber?: string;
  createdAt: string;
  student: { id: string; fullName: string; email: string; phone?: string; school?: string; grade?: string; };
  payment: { status: string; amount: number; } | null;
}

const STATUS_CLS: Record<string, string> = {
  pending_approval: 'badge-yellow',
  registered:       'badge-indigo',
  paid:             'badge-green',
  rejected:         'badge-red',
};

function Spinner() { return <span className="spin" />; }

export default function OrganizerParticipants() {
  const [comps, setComps]         = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loadingComps, setLoadingComps] = useState(true);
  const [msg, setMsg]             = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    organizerHttp.get<Competition[]>('/organizers/competitions')
      .then(r => setComps(r))
      .catch(e => setMsg({ ok: false, text: (e as Error).message }))
      .finally(() => setLoadingComps(false));
  }, []);

  useEffect(() => {
    if (!selectedComp) return;
    setLoading(true);
    organizerHttp.get<Registration[]>(`/organizers/competitions/${selectedComp}/registrations`)
      .then(r => setRegistrations(r))
      .catch(e => setMsg({ ok: false, text: (e as Error).message }))
      .finally(() => setLoading(false));
  }, [selectedComp]);

  const approve = async (id: string) => {
    try {
      await organizerHttp.post(`/organizers/registrations/${id}/approve`, {});
      setMsg({ ok: true, text: 'Registration approved!' });
      if (selectedComp) {
        const r = await organizerHttp.get<Registration[]>(`/organizers/competitions/${selectedComp}/registrations`);
        setRegistrations(r);
      }
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };

  const reject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason?.trim()) return;
    try {
      await organizerHttp.post(`/organizers/registrations/${id}/reject`, { reason });
      setMsg({ ok: true, text: 'Registration rejected.' });
      if (selectedComp) {
        const r = await organizerHttp.get<Registration[]>(`/organizers/competitions/${selectedComp}/registrations`);
        setRegistrations(r);
      }
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };

  const exportCsv = () => {
    if (!selectedComp) return;
    window.open(`/api/organizers/competitions/${selectedComp}/export`, '_blank');
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div className="fu">
          <p className="label" style={{ marginBottom: 6 }}>Management</p>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Participants</h1>
        </div>
        {selectedComp && (
          <button className="btn btn-ghost" onClick={exportCsv} style={{ marginBottom: 28 }}>
            ↓ Export CSV
          </button>
        )}
      </div>

      {msg && <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`} style={{ marginBottom: 16 }}>{msg.ok ? '✓' : '⚠'} {msg.text}</div>}

      {/* Competition selector */}
      <div style={{ marginBottom: 20 }}>
        <label className="label">Select Competition</label>
        <select className="input" style={{ maxWidth: 400 }} value={selectedComp} onChange={e => setSelectedComp(e.target.value)}>
          <option value="">— choose a competition —</option>
          {loadingComps
            ? <option disabled>Loading…</option>
            : comps.map(c => <option key={c.id} value={c.id}>{c.name} ({c.registrationCount} registrations)</option>)}
        </select>
      </div>

      {!selectedComp ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Select a competition above to view participants
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
            ) : registrations.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No registrations yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>School</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Grade</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Payment</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Registered</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(r => (
                    <tr key={r.id}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-1)', fontWeight: 500 }}>
                        <div>{r.student.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>{r.student.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>{r.student.school || '—'}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>{r.student.grade || '—'}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                        <span className={`badge ${STATUS_CLS[r.status] ?? 'badge-gray'}`}>{r.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                        {r.payment
                          ? <span className={`badge ${r.payment.status === 'settlement' || r.payment.status === 'capture' ? 'badge-green' : 'badge-yellow'}`}>
                              {r.payment.status}
                            </span>
                          : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                        {r.status === 'pending_approval' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary" onClick={() => approve(r.id)}
                              style={{ padding: '4px 10px', fontSize: 11, background: '#22c55e', border: 'none' }}>
                              Approve
                            </button>
                            <button className="btn btn-danger" onClick={() => reject(r.id)} style={{ padding: '4px 10px', fontSize: 11 }}>
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}