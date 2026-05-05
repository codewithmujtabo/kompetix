'use client';

import { useState, useEffect, useCallback } from 'react';
import { registrationsApi } from '@/lib/api';
import type { PendingRegistration } from '@/types';
import { PageHeader, Spinner, Toast } from '@/components/ui';

function formatFee(fee: number) {
  return fee === 0 ? 'Free' : `Rp ${fee.toLocaleString('id-ID')}`;
}

export default function RegistrationsPage() {
  const [items, setItems]       = useState<PendingRegistration[]>([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy]         = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await registrationsApi.listPending();
      setItems(r.pendingRegistrations);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleApprove = async (id: string) => {
    setBusy(id);
    try {
      await registrationsApi.approve(id);
      setItems(prev => prev.filter(r => r.registrationId !== id));
      flash(true, 'Registration approved — student notified.');
    } catch (e) {
      flash(false, (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectId || !reason.trim()) return;
    setBusy(rejectId);
    try {
      await registrationsApi.reject(rejectId, reason.trim());
      setItems(prev => prev.filter(r => r.registrationId !== rejectId));
      flash(true, 'Registration rejected — student notified.');
    } catch (e) {
      flash(false, (e as Error).message);
    } finally {
      setBusy(null);
      setRejectId(null);
      setReason('');
    }
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      <PageHeader sub="Admin" title="Pending Registrations" count={items.length} />
      {msg && <Toast ok={msg.ok} msg={msg.text} />}

      {/* Reject modal */}
      {rejectId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div className="card" style={{ width: 420, padding: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Reject Registration</div>
            <textarea
              className="input"
              rows={3}
              placeholder="Reason for rejection (required)…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', resize: 'vertical', marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setRejectId(null); setReason(''); }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#EF4444', borderColor: '#EF4444' }}
                disabled={!reason.trim() || busy === rejectId}
                onClick={handleRejectSubmit}
              >
                {busy === rejectId ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card fu" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : items.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>
              No pending registrations
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>School / Grade</th>
                  <th>Competition</th>
                  <th>Fee</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.registrationId}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.student.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>{r.student.email}</div>
                      {r.student.phone && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>{r.student.phone}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{r.student.school || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Grade {r.student.grade || '—'}</div>
                      {r.student.nisn && (
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>NISN {r.student.nisn}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{r.competition.name}</td>
                    <td>
                      <span className={`badge ${r.competition.fee === 0 ? 'badge-green' : 'badge-indigo'}`}>
                        {formatFee(r.competition.fee)}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
                      {new Date(r.registeredAt).toLocaleDateString('id-ID')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '5px 14px', fontSize: 12 }}
                          disabled={busy === r.registrationId}
                          onClick={() => handleApprove(r.registrationId)}
                        >
                          {busy === r.registrationId ? '…' : 'Approve'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '5px 14px', fontSize: 12, color: '#EF4444' }}
                          disabled={busy === r.registrationId}
                          onClick={() => { setRejectId(r.registrationId); setReason(''); }}
                        >
                          Reject
                        </button>
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
