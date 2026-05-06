'use client';

import { useState, useEffect } from 'react';
import { schoolHttp, useSchool } from '@/lib/auth/school-context';

interface Registration {
  registrationId: string;
  status: string;
  registeredAt: string;
  student: { id: string; name: string; email: string; grade?: string; };
  competition: { id: string; name: string; category?: string; regCloseDate?: string; };
  payment?: { status: string; amount: number; } | null;
}

interface Competition { id: string; name: string; }

const STATUS_CLS: Record<string, string> = {
  approved: 'badge-green', submitted: 'badge-indigo',
  pending:  'badge-yellow', rejected: 'badge-red',
  paid:     'badge-green',
};

function Spinner() { return <span className="spin" />; }

export default function RegistrationsPage() {
  const { user } = useSchool();
  const [regs, setRegs]           = useState<Registration[]>([]);
  const [comps, setComps]         = useState<Competition[]>([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [compFilter, setCompFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg]             = useState('');
  const LIMIT = 25;

  const isAdmin = user?.role === 'school_admin';

  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Для администратора - используем /schools/registrations
        const q = new URLSearchParams({
          page: String(page), limit: String(LIMIT),
          ...(compFilter   && { compId: compFilter }),
          ...(statusFilter && { status: statusFilter }),
        });
        const r = await schoolHttp.get<{ registrations: Registration[]; pagination: { total: number } }>(`/schools/registrations?${q}`);
        setRegs(r.registrations);
        setTotal(r.pagination.total);
      } else {
        // Для учителя - получаем данные через /teachers/my-competitions
        const response = await schoolHttp.get<any>('/teachers/my-competitions');
        
        // API возвращает { competitions: [] } а не массив
        const competitionsArray = response.competitions || [];
        
        if (!Array.isArray(competitionsArray)) {
          console.error('Expected array, got:', competitionsArray);
          setRegs([]);
          setTotal(0);
          setLoading(false);
          return;
        }
        
        // Преобразуем данные из формата учителя в формат регистраций
        const allRegs: Registration[] = [];
        for (const comp of competitionsArray) {
          // Проверяем, что у competition есть students
          if (comp.students && Array.isArray(comp.students)) {
            for (const student of comp.students) {
              allRegs.push({
                registrationId: student.id || `reg-${comp.id}-${Date.now()}`,
                status: student.status || 'registered',
                registeredAt: new Date().toISOString(),
                student: {
                  id: student.id,
                  name: student.fullName || student.name || '',
                  email: student.email || '',
                  grade: student.grade,
                },
                competition: {
                  id: comp.id,
                  name: comp.name,
                  category: comp.category,
                },
              });
            }
          }
        }
        
        // Применяем фильтры
        let filtered = allRegs;
        if (compFilter) filtered = filtered.filter(r => r.competition.id === compFilter);
        
        // Пагинация
        const start = (page - 1) * LIMIT;
        const paginated = filtered.slice(start, start + LIMIT);
        setRegs(paginated);
        setTotal(filtered.length);
      }
    } catch (e) { 
      console.error('Load error:', e);
      setMsg((e as Error).message); 
    } finally { 
      setLoading(false); 
    }
  };

  // Загрузка списка конкурсов для фильтра
  useEffect(() => {
    if (!user) return;
    
    if (isAdmin) {
      schoolHttp.get<Registration[]>('/schools/registrations?limit=500')
        .then(r => {
          const seen = new Map<string, Competition>();
          (Array.isArray(r) ? r : (r as any).registrations ?? []).forEach((reg: Registration) => {
            if (reg?.competition?.id && !seen.has(reg.competition.id)) {
              seen.set(reg.competition.id, { id: reg.competition.id, name: reg.competition.name });
            }
          });
          setComps([...seen.values()]);
        })
        .catch(() => {});
    } else {
      // Для учителя - загружаем конкурсы из his competitions
      schoolHttp.get<any>('/teachers/my-competitions')
        .then(data => {
          const competitionsArray = data.competitions || [];
          if (Array.isArray(competitionsArray)) {
            const compsList = competitionsArray.map(c => ({ id: c.id, name: c.name }));
            setComps(compsList);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin, user]);

  useEffect(() => { 
    if (user) load(); 
  }, [page, compFilter, statusFilter, user, isAdmin]);

  const exportCsv = () => {
    const headers = 'Student,Email,Grade,Competition,Status,Date\n';
    const rows = regs.map(r =>
      `"${r.student.name}","${r.student.email}","${r.student.grade ?? ''}","${r.competition.name}","${r.status}","${new Date(r.registeredAt).toLocaleDateString()}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `registrations-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const pages = Math.ceil(total / LIMIT);
  const STATUSES = ['', 'submitted', 'pending', 'approved', 'rejected', 'paid'];

  if (!user) return null;

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div className="fu">
          <p className="label" style={{ marginBottom: 6 }}>{isAdmin ? 'School Portal' : 'Teacher Portal'}</p>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Registrations</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{total} registrations</p>
        </div>
        {regs.length > 0 && (
          <button className="btn btn-ghost" onClick={exportCsv} style={{ marginBottom: 28 }}>↓ Export CSV</button>
        )}
      </div>

      {msg && <div className="toast toast-err" style={{ marginBottom: 16 }}>⚠ {msg}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {comps.length > 0 && (
          <select className="input" style={{ width: 260 }} value={compFilter} onChange={e => { setCompFilter(e.target.value); setPage(1); }}>
            <option value="">All competitions</option>
            {comps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button key={s} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                style={{ padding: '5px 12px', fontSize: 12 }}>
                {s || 'All'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : regs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              {isAdmin ? 'No registrations found.' : 'Your students have not registered for any competitions yet.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Student</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Competition</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Grade</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {regs.map((r, idx) => (
                  <tr key={r.registrationId || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{r.student.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.student.email}</div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div>{r.competition.name}</div>
                      {r.competition.category && <span className="badge badge-indigo" style={{ marginTop: 4, display: 'inline-block' }}>{r.competition.category}</span>}
                    </td>
                    <td style={{ padding: '10px 16px' }}>{r.student.grade ? <span className="badge badge-gray">Grade {r.student.grade}</span> : '—'}</td>
                    <td style={{ padding: '10px 16px' }}><span className={`badge ${STATUS_CLS[r.status] ?? 'badge-gray'}`}>{r.status}</span></td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
                      {new Date(r.registeredAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {pages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setPage(p => p - 1)} disabled={page === 1} style={{ padding: '5px 11px' }}>←</button>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-3)' }}>{page} / {pages}</span>
            <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)} disabled={page >= pages} style={{ padding: '5px 11px' }}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}