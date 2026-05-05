'use client';

import { useState, useEffect } from 'react';
import { competitionsApi } from '@/lib/api';
import type { Competition } from '@/types';
import { PageHeader, Spinner, Toast, Pager } from '@/components/ui';

const CATS = ['', 'Science', 'Math', 'Art', 'Sports', 'Technology', 'Literature', 'Music'];

const FORM_DEFAULTS = {
  name: '', organizer_name: '', category: '', grade_level: '',
  fee: '0', description: '', reg_open_date: '', reg_close_date: '', competition_date: '',
};

function fmtForInput(d?: string) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

export default function Competitions() {
  const [comps, setComps] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cat, setCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState(FORM_DEFAULTS);
  const LIMIT = 15;

  const load = async () => {
    setLoading(true);
    try {
      const r = await competitionsApi.list({ page, limit: LIMIT, category: cat || undefined });
     
      setComps(Array.isArray(r?.competitions) ? r.competitions : []);
      setTotal(r?.pagination?.total ?? 0);
    } catch (e) { 
      setMsg({ ok: false, text: (e as Error).message });
      setComps([]); 
      setTotal(0);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    load(); 
  }, [page, cat]);

  const openAdd = () => { 
    setEditId(null); 
    setForm({ ...FORM_DEFAULTS });
    setShowForm(true); 
  };

  const openEdit = (c: Competition) => {
    setEditId(c.id);
    setForm({
      name:             c.name,
      organizer_name:   c.organizer_name,
      category:         c.category        || '',
      grade_level:      c.grade_level     || '',
      fee:              String(c.fee ?? 0),
      description:      c.description     || '',
      reg_open_date:    fmtForInput(c.reg_open_date),
      reg_close_date:   fmtForInput(c.reg_close_date),
      competition_date: fmtForInput(c.competition_date),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => { 
    setShowForm(false); 
    setEditId(null); 
    setForm({ ...FORM_DEFAULTS });
  };

  const save = async () => {
    if (!form.name || !form.organizer_name) return;
    setSaving(true);
    try {
      const payload = { ...form, fee: parseInt(form.fee) || 0 };
      if (editId) {
        await competitionsApi.update(editId, payload);
        setMsg({ ok: true, text: 'Competition updated!' });
      } else {
        await competitionsApi.create(payload);
        setMsg({ ok: true, text: 'Competition created!' });
      }
      closeForm(); 
      load();
    } catch (e) { 
      setMsg({ ok: false, text: (e as Error).message }); 
    } finally { 
      setSaving(false); 
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { 
      await competitionsApi.delete(id); 
      load();
    } catch (e) { 
      setMsg({ ok: false, text: (e as Error).message }); 
    }
  };

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  // ✅ Добавляем безопасную проверку
  const hasComps = Array.isArray(comps) && comps.length > 0;

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <PageHeader sub="Management" title="Competitions" count={total} />
        <button className="btn btn-primary" onClick={showForm ? closeForm : openAdd} style={{ marginBottom: 28 }}>
          {showForm ? '✕ Cancel' : '+ New'}
        </button>
      </div>

      {msg && <Toast ok={msg.ok} msg={msg.text} />}

      {showForm && (
        <div className="card fu" style={{ marginBottom: 20, borderColor: editId ? 'rgba(99,102,241,.35)' : 'var(--border)' }}>
          <p className="label" style={{ marginBottom: 18 }}>{editId ? '✎ Edit Competition' : 'New Competition'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
            <F label="Name *">
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Olimpiade Matematika Nasional" />
            </F>
            <F label="Category">
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATS.map(c => <option key={c} value={c}>{c || 'Select…'}</option>)}
              </select>
            </F>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <F label="Organizer *">
              <input className="input" value={form.organizer_name} onChange={e => setForm(f => ({ ...f, organizer_name: e.target.value }))} placeholder="Kemendikbud" />
            </F>
            <F label="Grade Level">
              <input className="input" value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))} placeholder="SMP, SMA" />
            </F>
            <F label="Fee (IDR)">
              <input className="input" type="number" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
            </F>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <F label="Reg Open"><input className="input" type="date" value={form.reg_open_date} onChange={e => setForm(f => ({ ...f, reg_open_date: e.target.value }))} /></F>
            <F label="Reg Close"><input className="input" type="date" value={form.reg_close_date} onChange={e => setForm(f => ({ ...f, reg_close_date: e.target.value }))} /></F>
            <F label="Event Date"><input className="input" type="date" value={form.competition_date} onChange={e => setForm(f => ({ ...f, competition_date: e.target.value }))} /></F>
          </div>
          <div style={{ marginBottom: 18 }}>
            <F label="Description">
              <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the competition…" />
            </F>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.name || !form.organizer_name}>
              {saving ? <Spinner /> : editId ? '✓' : '+'} {editId ? 'Save Changes' : 'Create'}
            </button>
            <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATS.map(c => (
          <button key={c} className={`btn ${cat === c ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setCat(c); setPage(1); }} style={{ padding: '5px 13px', fontSize: 12 }}>
            {c || 'All'}
          </button>
        ))}
      </div>

      <div className="card fu" style={{ padding: 0, overflow: 'hidden', animationDelay: '.05s' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : !hasComps ? (  // ✅ используем безопасную проверку
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>
              No competitions
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Organizer</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Fee</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Close</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}></th>
                </tr>
              </thead>
              <tbody>
                {comps.map(c => (
                  <tr key={c.id} style={{ background: editId === c.id ? 'rgba(99,102,241,.05)' : undefined }}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-1)', fontWeight: 500, maxWidth: 240 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      {c.grade_level && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{c.grade_level}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      {c.category ? <span className="badge badge-indigo">{c.category}</span> : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>{c.organizer_name}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      {c.fee === 0 ? <span className="badge badge-green">Free</span> : `Rp ${c.fee.toLocaleString('id-ID')}`}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
                      {fmtDate(c.reg_close_date)}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
                      {fmtDate(c.competition_date)}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => openEdit(c)} style={{ padding: '4px 10px', fontSize: 11 }}>Edit</button>
                        <button className="btn btn-danger" onClick={() => remove(c.id, c.name)} style={{ padding: '4px 10px', fontSize: 11 }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pager page={page} total={total} limit={LIMIT} onChange={setPage} />
      </div>
    </div>
  );
}