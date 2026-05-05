'use client';

import { useState, useEffect } from 'react';
import { organizerHttp } from '@/lib/auth/organizer-context';
import Link from 'next/link';

interface Competition {
  id: string;
  name: string;
  category?: string;
  registrationStatus: string;
  registrationCount: number;
  regCloseDate?: string;
  competitionDate?: string;
  fee: number;
}

const STATUS_BADGE: Record<string, { cls: string }> = {
  'Open':        { cls: 'badge-green' },
  'Coming Soon': { cls: 'badge-yellow' },
  'Closed':      { cls: 'badge-red' },
  'Draft':       { cls: 'badge-gray' },
};

function Spinner() { return <span className="spin" />; }
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

export default function OrganizerCompetitions() {
  const [comps, setComps]     = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await organizerHttp.get<Competition[]>('/organizers/competitions');
      setComps(r);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const publish = async (id: string) => {
    try {
      await organizerHttp.post(`/organizers/competitions/${id}/publish`, {});
      setMsg({ ok: true, text: 'Competition published!' });
      load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };

  const close = async (id: string) => {
    if (!confirm('Close registration for this competition?')) return;
    try {
      await organizerHttp.post(`/organizers/competitions/${id}/close`, {});
      setMsg({ ok: true, text: 'Registration closed.' });
      load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div className="fu">
          <p className="label" style={{ marginBottom: 6 }}>My Competitions</p>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Competitions</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{comps.length} total</p>
        </div>
        <Link 
          href="/organizer-competitions/new"
          className="btn btn-primary"
          style={{ marginBottom: 28, background: 'linear-gradient(135deg,#f59e0b,#f97316)', border: 'none' }}>
          + New Competition
        </Link>
      </div>

      {msg && <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`}>{msg.ok ? '✓' : '⚠'} {msg.text}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : comps.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              No competitions yet.{' '}
              <Link href="/organizer-competitions/new" style={{ color: '#f59e0b', textDecoration: 'none' }}>
                Create your first one →
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Registrations</th>
                  <th>Fee</th>
                  <th>Close Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {comps.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-1)', fontWeight: 500, maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    </td>
                    <td>{c.category ? <span className="badge badge-indigo">{c.category}</span> : '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[c.registrationStatus]?.cls ?? 'badge-gray'}`}>
                        {c.registrationStatus}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{c.registrationCount}</td>
                    <td style={{ fontSize: 12 }}>
                      {c.fee === 0
                        ? <span className="badge badge-green">Free</span>
                        : `Rp ${c.fee.toLocaleString('id-ID')}`}
                    </td>
                    <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 }}>{fmtDate(c.regCloseDate)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link 
                          href={`/organizer-competitions/${c.id}`}
                          className="btn btn-ghost" 
                          style={{ padding: '4px 10px', fontSize: 11 }}>
                          View
                        </Link>
                        <Link 
                          href={`/organizer-competitions/${c.id}/edit`}
                          className="btn btn-ghost" 
                          style={{ padding: '4px 10px', fontSize: 11 }}>
                          Edit
                        </Link>
                        {c.registrationStatus === 'Coming Soon' || c.registrationStatus === 'Draft' ? (
                          <button className="btn btn-primary" onClick={() => publish(c.id)}
                            style={{ padding: '4px 10px', fontSize: 11, background: '#22c55e', border: 'none' }}>
                            Publish
                          </button>
                        ) : c.registrationStatus === 'Open' ? (
                          <button className="btn btn-danger" onClick={() => close(c.id)} style={{ padding: '4px 10px', fontSize: 11 }}>
                            Close
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}