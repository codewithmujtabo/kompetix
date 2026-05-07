'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { schoolHttp, useSchool } from '@/lib/auth/school-context';

interface RegistrationRow {
  registrationId: string;
  status: string;
  student: { id: string; name: string; email?: string; grade?: string };
  competition: { id: string; name: string; fee: number };
}

interface BatchResult {
  batchId: string;
  snapToken: string;
  snapRedirectUrl: string;
  totalAmount: number;
}

function Spinner() { return <span className="spin" />; }

function fmtRp(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function BulkPaymentPage() {
  const { user, loading: authLoading } = useSchool();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterCompId = searchParams.get('competitionId');

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      loadRegistrations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const loadRegistrations = async () => {
    setLoading(true);
    setMsg(null);
    try {
      let rows: RegistrationRow[] = [];

      if (user?.role === 'school_admin') {
        const query = filterCompId
          ? `/schools/registrations?status=registered&compId=${filterCompId}&limit=200`
          : '/schools/registrations?status=registered&limit=200';
        const data = await schoolHttp.get<{ registrations: RegistrationRow[] }>(query);
        rows = data.registrations ?? [];
      } else {
        // Teacher: derive from my-competitions
        const data = await schoolHttp.get<{
          competitions: {
            id: string; name: string; fee: number;
            students: { id: string; fullName: string; grade: string; status: string; registrationId: string }[];
          }[]
        }>('/teachers/my-competitions');

        for (const comp of data.competitions ?? []) {
          if (filterCompId && comp.id !== filterCompId) continue;
          for (const s of comp.students) {
            if (s.status === 'registered') {
              rows.push({
                registrationId: s.registrationId,
                status: s.status,
                student: { id: s.id, name: s.fullName, grade: s.grade },
                competition: { id: comp.id, name: comp.name, fee: comp.fee },
              });
            }
          }
        }
      }

      setRegistrations(rows);
      // Select all by default
      setSelected(new Set(rows.map(r => r.registrationId)));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div style={{ padding: '36px 40px', textAlign: 'center' }}><Spinner /></div>;
  }

  if (!user || (user.role !== 'school_admin' && user.role !== 'teacher')) {
    return (
      <div style={{ padding: '36px 40px', textAlign: 'center' }}>
        <div className="toast toast-err" style={{ marginBottom: 16 }}>
          ⚠ Access denied. School admin or teacher role required.
        </div>
        <button onClick={() => router.push('/school-dashboard')} className="btn btn-primary">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const toggleRow = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allSelected = registrations.length > 0 && selected.size === registrations.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(registrations.map(r => r.registrationId)));

  const selectedRows = registrations.filter(r => selected.has(r.registrationId));
  const totalAmount = selectedRows.reduce((sum, r) => sum + (r.competition.fee ?? 0), 0);

  const handlePay = async () => {
    if (selected.size === 0) return;
    setPaying(true);
    setMsg(null);
    try {
      const result = await schoolHttp.post<BatchResult>('/payments/school-batch', {
        registrationIds: [...selected],
      });
      setBatchResult(result);
      // Open Midtrans in a new tab
      window.open(result.snapRedirectUrl, '_blank');
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmPayment = async () => {
    setConfirmingPayment(true);
    setMsg(null);
    try {
      // Reload registrations to check updated statuses
      await loadRegistrations();
      setPaymentConfirmed(true);
      setBatchResult(null);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setConfirmingPayment(false);
    }
  };

  // Payment opened state
  if (batchResult) {
    return (
      <div style={{ padding: '36px 40px', maxWidth: 600 }}>
        <div className="fu" style={{ marginBottom: 32 }}>
          <p className="label" style={{ marginBottom: 6 }}>School Portal</p>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Bulk Payment</h1>
        </div>

        <div className="card fu" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Payment Page Opened</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 4 }}>
            A Midtrans payment page has been opened in a new tab.
          </p>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>
            Total: <strong style={{ color: 'var(--text-1)' }}>{fmtRp(batchResult.totalAmount)}</strong> for {selectedRows.length} students
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-ghost"
              onClick={() => window.open(batchResult.snapRedirectUrl, '_blank')}
              style={{ justifyContent: 'center' }}
            >
              ↗ Reopen Payment Page
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmPayment}
              disabled={confirmingPayment}
              style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', justifyContent: 'center' }}
            >
              {confirmingPayment ? <Spinner /> : '✅ I\'ve Completed Payment'}
            </button>
            <button className="btn btn-ghost" onClick={() => setBatchResult(null)} style={{ justifyContent: 'center', color: 'var(--text-3)' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment confirmed state
  if (paymentConfirmed) {
    return (
      <div style={{ padding: '36px 40px', maxWidth: 600 }}>
        <div className="card fu" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Payment Submitted</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>
            Your payment is being processed. Registrations will update to &quot;paid&quot; once Midtrans confirms.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a href="/school-registrations" className="btn btn-primary" style={{ textDecoration: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none' }}>
              📋 View Registrations
            </a>
            <button className="btn btn-ghost" onClick={() => { setPaymentConfirmed(false); loadRegistrations(); }}>
              ↩ Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div className="fu">
          <p className="label" style={{ marginBottom: 6 }}>School Portal</p>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Bulk Payment</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
            Pay for multiple students in a single Midtrans transaction.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => router.back()}>← Back</button>
      </div>

      {msg && (
        <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`} style={{ marginBottom: 16 }}>
          {msg.ok ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : registrations.length === 0 ? (
        <div className="card fu" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
          <p style={{ fontWeight: 500, marginBottom: 8 }}>No pending payments</p>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            All registered students have been paid, or no students are currently in &quot;registered&quot; status.
          </p>
        </div>
      ) : (
        <div className="card fu" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 500 }}>{allSelected ? 'Deselect All' : 'Select All'}</span>
            </label>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {selected.size} of {registrations.length} selected
            </span>
          </div>

          {/* Registrations table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-2)' }}>
                  <th style={{ padding: '10px 16px', width: 40 }} />
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Student</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Competition</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Grade</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Fee</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r, i) => {
                  const isSelected = selected.has(r.registrationId);
                  return (
                    <tr
                      key={r.registrationId}
                      onClick={() => toggleRow(r.registrationId)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(59,130,246,.05)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.01)',
                        borderBottom: i < registrations.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background var(--ease)',
                      }}
                    >
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(r.registrationId)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: 15, height: 15, cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{r.student.name}</div>
                        {r.student.email && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>{r.student.email}</div>}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{r.competition.name}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 12 }}>
                        {r.student.grade ? `Grade ${r.student.grade}` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'var(--ff-mono)', color: 'var(--text-1)', fontWeight: 500 }}>
                        {r.competition.fee > 0 ? fmtRp(r.competition.fee) : <span style={{ color: 'var(--text-3)' }}>Free</span>}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span className="badge badge-indigo" style={{ fontSize: 11 }}>{r.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{selected.size} students selected — </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Total: {fmtRp(totalAmount)}</span>
            </div>
            <button
              className="btn btn-primary"
              onClick={handlePay}
              disabled={selected.size === 0 || paying || totalAmount === 0}
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', border: 'none' }}
            >
              {paying ? <Spinner /> : `💳 Pay ${fmtRp(totalAmount)} via Midtrans`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
