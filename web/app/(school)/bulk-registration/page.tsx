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
  csvTemplateUrl?: string | null;
}

interface CsvRow {
  [key: string]: string;
}

interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errors: { row: number; error: string }[];
  progress: number;
}

function Spinner() { return <span className="spin" />; }

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const splitLine = (l: string) => l.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const cells = splitLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
  return { headers, rows };
}

function buildUploadCsv(rows: CsvRow[], competitionId: string): File {
  const headers = [...Object.keys(rows[0]).filter(h => h !== 'competition_id'), 'competition_id'];
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => h === 'competition_id' ? competitionId : (r[h] ?? '')).join(',')),
  ];
  return new File([lines.join('\n')], 'bulk-registration.csv', { type: 'text/csv' });
}

function rowHasIssue(row: CsvRow): boolean {
  return !row['full_name']?.trim() || !row['email']?.trim();
}

export default function BulkRegistrationPage() {
  const { user, loading: authLoading } = useSchool();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [competitions, setComps] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      schoolHttp.get<Competition[]>('/competitions?registration_status=Open&limit=100')
        .then(data => setComps(Array.isArray(data) ? data : []))
        .catch(e => setMsg({ ok: false, text: (e as Error).message }));
    }
  }, [user, authLoading]);

  // Poll job status
  useEffect(() => {
    if (!jobStatus?.id || jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const r = await schoolHttp.get<JobStatus>(`/bulk-registration/jobs/${jobStatus.id}`);
        setJobStatus(r);
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobStatus?.id, jobStatus?.status]);

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

  const handleSelectComp = async (comp: Competition) => {
    setSelectedComp(comp);
    if (comp.csvTemplateUrl === undefined) {
      setLoadingTemplate(true);
      try {
        const detail = await schoolHttp.get<{ csv_template_url?: string; csvTemplateUrl?: string }>(
          `/competitions/${comp.id}`
        );
        const url = detail.csvTemplateUrl ?? detail.csv_template_url ?? null;
        setSelectedComp({ ...comp, csvTemplateUrl: url });
      } catch { /* non-critical */ }
      finally { setLoadingTemplate(false); }
    }
  };

  const handleFileSelect = (file: File | null) => {
    setCsvFile(file);
    setCsvRows([]);
    setCsvHeaders([]);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsv(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const issueCount = csvRows.filter(rowHasIssue).length;

  const handleSubmit = async () => {
    if (!selectedComp || csvRows.length === 0) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const uploadFile = buildUploadCsv(csvRows, selectedComp.id);
      const form = new FormData();
      form.append('file', uploadFile);
      const res = await schoolFetch('/bulk-registration/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Upload failed');
      setJobStatus({
        id: data.jobId,
        status: 'pending',
        totalRows: csvRows.length,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        errors: [],
        progress: 0,
      });
      setStep(3);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = ['Select Competition', 'Upload & Preview', 'Processing', 'Results'];

  const errorRowNums = new Set(jobStatus?.errors.map(e => e.row) ?? []);

  return (
    <div style={{ padding: '36px 40px', maxWidth: 900 }}>
      <div className="fu" style={{ marginBottom: 32 }}>
        <p className="label" style={{ marginBottom: 6 }}>School Portal</p>
        <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Bulk Registration</h1>
      </div>

      {msg && (
        <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`} style={{ marginBottom: 16 }}>
          {msg.ok ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const active = step === n;
          const done = step > n;
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
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--text-1)' : 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 1, background: done ? '#22c55e' : 'var(--border)', margin: '0 8px' }} />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1 — Select competition ── */}
      {step === 1 && (
        <div className="card fu">
          <p className="label" style={{ marginBottom: 16 }}>Choose a Competition</p>
          {competitions.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No open competitions available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {competitions.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelectComp(c)}
                  style={{
                    padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${selectedComp?.id === c.id ? '#3b82f6' : 'var(--border)'}`,
                    background: selectedComp?.id === c.id ? 'rgba(59,130,246,.08)' : 'var(--bg-elevated)',
                    transition: 'all var(--ease)',
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 12 }}>
                    {c.category && <span>{c.category}</span>}
                    <span>{c.fee === 0 ? 'Free' : `Rp ${c.fee.toLocaleString('id-ID')}/student`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Template info panel */}
          {selectedComp && (
            <div style={{ padding: '16px 18px', borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border)', marginBottom: 16 }}>
              {loadingTemplate ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)' }}>
                  <Spinner /> Loading template info…
                </div>
              ) : selectedComp.csvTemplateUrl ? (
                <div>
                  <p style={{ fontWeight: 500, fontSize: 13, marginBottom: 6 }}>📄 CSV Template Available</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                    The organizer has provided a sample CSV showing the required format for this competition. Download it, fill in your students&apos; data, and upload in the next step.
                  </p>
                  <a
                    href={selectedComp.csvTemplateUrl}
                    download
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={e => e.stopPropagation()}
                  >
                    📥 Download CSV Template
                  </a>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>📋 No template for this competition</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    Use the standard format. Required columns: <code>full_name</code>, <code>email</code> — Optional: <code>nisn</code>, <code>grade</code>, <code>school_name</code>, <code>phone</code>
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={() => setStep(2)}
            disabled={!selectedComp}
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none' }}
          >
            Continue → Upload CSV
          </button>
        </div>
      )}

      {/* ── Step 2 — Upload & Preview ── */}
      {step === 2 && (
        <div className="card fu">
          <div style={{ marginBottom: 20 }}>
            <p className="label" style={{ marginBottom: 4 }}>Competition</p>
            <p style={{ fontWeight: 500 }}>{selectedComp?.name}</p>
          </div>

          <p className="label" style={{ marginBottom: 10 }}>Upload CSV File</p>
          <div style={{
            border: '2px dashed var(--border)', borderRadius: 10, padding: '24px',
            textAlign: 'center', marginBottom: 16,
            background: csvFile ? 'rgba(59,130,246,.04)' : 'var(--bg-2)',
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            {csvFile ? (
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>📄 {csvFile.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                  {csvRows.length} rows detected
                </p>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setCsvFile(null); setCsvRows([]); setCsvHeaders([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 32, marginBottom: 8 }}>📂</p>
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>Drop your CSV here or</p>
                <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
                  Browse file
                </button>
              </div>
            )}
          </div>

          {/* CSV Preview Table */}
          {csvRows.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {/* Summary bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p className="label" style={{ margin: 0 }}>Preview — {csvRows.length} students</p>
                {issueCount > 0 && (
                  <span className="badge" style={{ background: 'rgba(245,158,11,.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.3)' }}>
                    ⚠ {issueCount} row{issueCount > 1 ? 's' : ''} missing full_name or email
                  </span>
                )}
              </div>

              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-2)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)', width: 36 }}>#</th>
                      {csvHeaders.map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          {h}
                          {(h === 'full_name' || h === 'email') && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 50).map((row, i) => {
                      const hasIssue = rowHasIssue(row);
                      return (
                        <tr key={i} style={{ background: hasIssue ? 'rgba(245,158,11,.06)' : 'transparent', borderBottom: i < csvRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '7px 12px', color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>
                            {hasIssue ? '⚠' : i + 1}
                          </td>
                          {csvHeaders.map(h => (
                            <td key={h} style={{ padding: '7px 12px', color: (!row[h] && (h === 'full_name' || h === 'email')) ? '#f59e0b' : 'var(--text-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row[h] || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>empty</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {csvRows.length > 50 && (
                  <p style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
                    Showing first 50 of {csvRows.length} rows. All rows will be submitted.
                  </p>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={csvRows.length === 0 || submitting}
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', flex: 1, justifyContent: 'center' }}
            >
              {submitting ? <Spinner /> : `📋 Register ${csvRows.length} Students`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 — Processing ── */}
      {step === 3 && jobStatus && (
        <div className="card fu">
          <p className="label" style={{ marginBottom: 16 }}>Processing Registrations</p>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-2)' }}>
                {jobStatus.status === 'completed' ? '✅ Complete' :
                 jobStatus.status === 'failed' ? '❌ Failed' :
                 jobStatus.status === 'processing' ? '⏳ Processing…' : '🕐 Queued — waiting for processor…'}
              </span>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-3)' }}>
                {jobStatus.processedRows}/{jobStatus.totalRows}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: jobStatus.status === 'completed' ? '#22c55e' : 'linear-gradient(90deg,#3b82f6,#6366f1)',
                width: `${jobStatus.progress ?? (jobStatus.totalRows > 0 ? (jobStatus.processedRows / jobStatus.totalRows) * 100 : 0)}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontFamily: 'var(--ff-display)', color: '#22c55e' }}>{jobStatus.successfulRows}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Registered</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontFamily: 'var(--ff-display)', color: '#ef4444' }}>{jobStatus.failedRows}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Failed</div>
            </div>
          </div>

          {(jobStatus.status === 'pending' || jobStatus.status === 'processing') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
              <Spinner /> Processing registrations, please wait…
            </div>
          )}

          {(jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
            <button className="btn btn-primary" onClick={() => setStep(4)}
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none' }}>
              View Results →
            </button>
          )}
        </div>
      )}

      {/* ── Step 4 — Results table ── */}
      {step === 4 && jobStatus && (
        <div className="card fu">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="label" style={{ margin: 0 }}>Results — {selectedComp?.name}</p>
            <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
              <span style={{ color: '#22c55e' }}>✅ {jobStatus.successfulRows} ok</span>
              {jobStatus.failedRows > 0 && <span style={{ color: '#ef4444' }}>❌ {jobStatus.failedRows} failed</span>}
            </div>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-2)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)', width: 36 }}>#</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Name</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Email</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {csvRows.map((row, i) => {
                  const rowNum = i + 1;
                  const err = jobStatus.errors.find(e => e.row === rowNum);
                  const failed = errorRowNums.has(rowNum);
                  return (
                    <tr key={i} style={{
                      background: failed ? 'rgba(239,68,68,.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)',
                      borderBottom: i < csvRows.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <td style={{ padding: '7px 12px', color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>{rowNum}</td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-1)', fontWeight: 500 }}>{row['full_name'] || '—'}</td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-2)', fontFamily: 'var(--ff-mono)', fontSize: 11 }}>{row['email'] || '—'}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                        {failed
                          ? <span style={{ color: '#ef4444', fontSize: 15 }}>❌</span>
                          : <span style={{ color: '#22c55e', fontSize: 15 }}>✅</span>
                        }
                      </td>
                      <td style={{ padding: '7px 12px', color: failed ? '#fca5a5' : 'var(--text-3)', fontSize: 11 }}>
                        {err ? err.error : 'Registered successfully'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/school-registrations" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              📋 View All Registrations
            </a>
            {(selectedComp?.fee ?? 0) > 0 && jobStatus.successfulRows > 0 && (
              <a
                href={`/bulk-payment?competitionId=${selectedComp?.id}`}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', border: 'none', textDecoration: 'none' }}
              >
                💳 Pay for Registered Students →
              </a>
            )}
            <button className="btn btn-ghost" onClick={() => { setStep(1); setSelectedComp(null); setCsvFile(null); setCsvRows([]); setCsvHeaders([]); setJobStatus(null); setMsg(null); }}>
              ↩ New Bulk Registration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
