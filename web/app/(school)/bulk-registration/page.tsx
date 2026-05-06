'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { schoolHttp, schoolFetch, useSchool } from '@/lib/auth/school-context';

interface Competition {
  id: string;
  name: string;
  category?: string;
  fee: number;
  regCloseDate?: string;
  registration_status?: string;
}

interface Student {
  id: string;
  fullName: string;
  nisn?: string;
  grade?: string;
}

interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  total: number;
  processed: number;
  success: number;
  failed: number;
  errors?: string[];
}

function Spinner() { return <span className="spin" />; }

export default function BulkRegistrationPage() {
  const { user, loading: authLoading } = useSchool();
  const router = useRouter();
  const [step, setStep]           = useState<1 | 2 | 3 | 4>(1);
  const [competitions, setComps]  = useState<Competition[]>([]);
  const [students, setStudents]   = useState<Student[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchVal, setSearchVal] = useState('');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]             = useState<{ ok: boolean; text: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Проверка доступа - только для school_admin
  useEffect(() => {
    if (!authLoading && user && user.role !== 'school_admin') {
      router.replace('/school-dashboard');
    }
  }, [user, authLoading, router]);

  // Если загрузка аутентификации
  if (authLoading) {
    return (
      <div style={{ padding: '36px 40px', textAlign: 'center' }}>
        <Spinner />
      </div>
    );
  }

  // Если не администратор, показываем ошибку доступа
  if (!user || user.role !== 'school_admin') {
    return (
      <div style={{ padding: '36px 40px', textAlign: 'center' }}>
        <div className="toast toast-err" style={{ marginBottom: 16 }}>
          ⚠ Access denied. School administrator role required for bulk registration.
        </div>
        <button 
          onClick={() => router.push('/school-dashboard')} 
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  useEffect(() => {
    Promise.all([
      schoolHttp.get<Competition[]>('/competitions?registration_status=Open&limit=100'),
      schoolHttp.get<{ students: Student[] }>('/schools/students?limit=500'),
    ]).then(([comps, studs]) => {
      setComps(Array.isArray(comps) ? comps : []);
      setStudents(studs.students);
    }).catch(e => setMsg({ ok: false, text: (e as Error).message }));
  }, []);

  // Poll job status
  useEffect(() => {
    if (!jobStatus?.jobId || jobStatus.status === 'done' || jobStatus.status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const r = await schoolHttp.get<JobStatus>(`/bulk-registration/status/${jobStatus.jobId}`);
        setJobStatus(r);
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobStatus?.jobId, jobStatus?.status]);

  const toggle = (id: string) =>
    setSelectedStudents(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAll = () => setSelectedStudents(new Set(filtered.map(s => s.id)));
  const clearAll  = () => setSelectedStudents(new Set());

  const filtered = students.filter(s =>
    !searchVal ||
    s.fullName.toLowerCase().includes(searchVal.toLowerCase()) ||
    (s.nisn ?? '').includes(searchVal)
  );

  const handleSubmit = async () => {
    if (!selectedComp || selectedStudents.size === 0) return;
    setSubmitting(true);
    try {
      // Build CSV
      const header = 'student_id,competition_id';
      const rows   = [...selectedStudents].map(sid => `${sid},${selectedComp.id}`);
      const csv    = [header, ...rows].join('\n');
      const blob   = new Blob([csv], { type: 'text/csv' });
      const form   = new FormData();
      form.append('file', blob, 'bulk-registration.csv');

      const res  = await schoolFetch('/bulk-registration/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setJobStatus({ jobId: data.jobId, status: 'pending', total: selectedStudents.size, processed: 0, success: 0, failed: 0 });
      setStep(4);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setSubmitting(false); }
  };

  const selectedStudentList = students.filter(s => selectedStudents.has(s.id));
  const totalFee = selectedStudentList.length * (selectedComp?.fee ?? 0);

  return (
    <div style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div className="fu" style={{ marginBottom: 32 }}>
        <p className="label" style={{ marginBottom: 6 }}>School Portal</p>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Bulk Registration</h1>
      </div>

      {msg && <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`} style={{ marginBottom: 16 }}>{msg.ok ? '✓' : '⚠'} {msg.text}</div>}

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
        {['Select Competition', 'Select Students', 'Review', 'Submit'].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done   = step > n;
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#22c55e' : active ? '#3b82f6' : 'var(--bg-elevated)',
                  border: `2px solid ${done ? '#22c55e' : active ? '#3b82f6' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, color: done || active ? '#fff' : 'var(--text-3)',
                }}>
                  {done ? '✓' : n}
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--text-1)' : 'var(--text-3)', whiteSpace: 'nowrap' }}>{label}</span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 1, background: done ? '#22c55e' : 'var(--border)', margin: '0 8px' }} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Select competition */}
      {step === 1 && (
        <div className="card fu">
          <p className="label" style={{ marginBottom: 16 }}>Choose a Competition</p>
          {competitions.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No open competitions available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {competitions.map(c => (
                <div key={c.id} onClick={() => setSelectedComp(c)}
                  style={{
                    padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${selectedComp?.id === c.id ? '#3b82f6' : 'var(--border)'}`,
                    background: selectedComp?.id === c.id ? 'rgba(59,130,246,.08)' : 'var(--bg-elevated)',
                    transition: 'all var(--ease)',
                  }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 12 }}>
                    {c.category && <span>{c.category}</span>}
                    <span>{c.fee === 0 ? 'Free' : `Rp ${c.fee.toLocaleString('id-ID')}/student`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!selectedComp}
            style={{ marginTop: 20, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none' }}>
            Next → Select Students
          </button>
        </div>
      )}

      {/* Step 2 — Select students */}
      {step === 2 && (
        <div className="card fu">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="label" style={{ margin: 0 }}>Select Students</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {selectedStudents.size > 0 && <span className="badge badge-indigo">{selectedStudents.size} selected</span>}
              <button className="btn btn-ghost" onClick={selectAll}  style={{ padding: '4px 10px', fontSize: 11 }}>All</button>
              <button className="btn btn-ghost" onClick={clearAll}   style={{ padding: '4px 10px', fontSize: 11 }}>Clear</button>
            </div>
          </div>
          <input className="input" placeholder="Search by name or NISN…" value={searchVal}
            onChange={e => setSearchVal(e.target.value)} style={{ marginBottom: 12 }} />
          <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filtered.map(s => {
              const on = selectedStudents.has(s.id);
              return (
                <div key={s.id} onClick={() => toggle(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderRadius: 8, cursor: 'pointer',
                  background: on ? 'rgba(59,130,246,.08)' : 'transparent',
                  border: `1px solid ${on ? 'rgba(59,130,246,.3)' : 'transparent'}`,
                  transition: 'all var(--ease)',
                }}>
                  <div style={{ width: 17, height: 17, borderRadius: 4, flexShrink: 0, background: on ? '#3b82f6' : 'var(--bg-elevated)', border: `1.5px solid ${on ? '#3b82f6' : 'var(--border-light)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>{on && '✓'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--text-1)' : 'var(--text-2)' }}>{s.fullName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>
                      {[s.nisn && `NISN: ${s.nisn}`, s.grade && `Grade ${s.grade}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)} disabled={selectedStudents.size === 0}
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none' }}>
              Next → Review ({selectedStudents.size})
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className="card fu">
          <p className="label" style={{ marginBottom: 16 }}>Review Before Submit</p>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4 }}>Competition</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{selectedComp?.name}</div>
            {selectedComp?.category && <span className="badge badge-indigo" style={{ marginTop: 6, display: 'inline-block' }}>{selectedComp.category}</span>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <p className="label" style={{ marginBottom: 10 }}>Students ({selectedStudentList.length})</p>
            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedStudentList.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-1)' }}>{s.fullName}</span>
                  <span style={{ color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
                    {s.grade ? `Grade ${s.grade}` : ''} {s.nisn ? `· ${s.nisn}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {totalFee > 0 && (
            <div style={{ background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>
                <span>Fee per student</span>
                <span>Rp {selectedComp?.fee.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                <span>Total ({selectedStudentList.length} students)</span>
                <span>Rp {totalFee.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', flex: 1, justifyContent: 'center' }}>
              {submitting ? <Spinner /> : '📋'} Submit {selectedStudentList.length} Registrations
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Job progress */}
      {step === 4 && jobStatus && (
        <div className="card fu">
          <p className="label" style={{ marginBottom: 16 }}>Registration Progress</p>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-2)' }}>
                {jobStatus.status === 'done' ? '✅ Complete' :
                 jobStatus.status === 'failed' ? '❌ Failed' :
                 jobStatus.status === 'processing' ? '⏳ Processing…' : '🕐 Queued…'}
              </span>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                {jobStatus.processed}/{jobStatus.total}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: jobStatus.status === 'done' ? '#22c55e' : 'linear-gradient(90deg,#3b82f6,#6366f1)',
                width: `${jobStatus.total > 0 ? (jobStatus.processed / jobStatus.total) * 100 : 0}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {(jobStatus.status === 'done' || jobStatus.status === 'failed') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontFamily: 'var(--ff-display)', color: '#22c55e' }}>{jobStatus.success}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Successful</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontFamily: 'var(--ff-display)', color: '#ef4444' }}>{jobStatus.failed}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Failed</div>
              </div>
            </div>
          )}

          {jobStatus.errors && jobStatus.errors.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#fca5a5', marginBottom: 8, fontFamily: 'var(--ff-mono)' }}>ERRORS</p>
              {jobStatus.errors.map((e, i) => (
                <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>• {e}</p>
              ))}
            </div>
          )}

          {jobStatus.status === 'done' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/school-registrations" className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                View Registrations →
              </a>
              {(selectedComp?.fee ?? 0) > 0 && (
                <a href="/bulk-payment" className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', border: 'none', flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                  💳 Pay Now →
                </a>
              )}
            </div>
          )}

          {(jobStatus.status === 'pending' || jobStatus.status === 'processing') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 13 }}>
              <Spinner /> Processing registrations, please wait…
            </div>
          )}
        </div>
      )}
    </div>
  );
}