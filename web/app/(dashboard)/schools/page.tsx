'use client';

import { useState, useEffect } from 'react';
import { schoolsApi } from '@/lib/api';
import type { School } from '@/types';
import { PageHeader, Spinner, Toast, Pager } from '@/components/ui';

export default function Schools() {
  const [schools, setSchools]     = useState<School[]>([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [msg, setMsg]             = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ npsn: '', name: '', city: '', province: '', address: '' });
  const LIMIT = 20;

  const load = async () => {
    setLoading(true);
    try {
      const r = await schoolsApi.list({ page, limit: LIMIT, search: search || undefined });
      setSchools(r?.schools ?? []); setTotal(r?.pagination?.total ?? 0);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, search]);

  const save = async () => {
    if (!form.npsn || !form.name) return;
    setSaving(true);
    try {
      await schoolsApi.create(form);
      setMsg({ ok: true, text: 'School added!' });
      setShowAdd(false);
      setForm({ npsn: '', name: '', city: '', province: '', address: '' });
      load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <PageHeader sub="Management" title="Schools" count={total} />
        <button className="btn btn-primary" onClick={() => setShowAdd(v => !v)} style={{ marginBottom: 28 }}>
          {showAdd ? '✕ Cancel' : '+ Add School'}
        </button>
      </div>

      {msg && <Toast ok={msg.ok} msg={msg.text} />}

      {showAdd && (
        <div className="card fu" style={{ marginBottom: 20 }}>
          <p className="label" style={{ marginBottom: 18 }}>New School</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="label">NPSN *</label>
              <input className="input" value={form.npsn} onChange={e => setForm(f => ({ ...f, npsn: e.target.value }))} placeholder="12345678" />
            </div>
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="SDN 001 Jakarta" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Jakarta" />
            </div>
            <div>
              <label className="label">Province</label>
              <input className="input" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} placeholder="DKI Jakarta" />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Jl. Sudirman No. 1" />
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.npsn || !form.name}>
            {saving ? <Spinner /> : '+'} Save
          </button>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); setSearch(searchVal); setPage(1); }} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search name, city, NPSN…" value={searchVal} onChange={e => setSearchVal(e.target.value)} />
        <button className="btn btn-ghost" type="submit">Search</button>
        {search && <button className="btn btn-ghost" type="button" onClick={() => { setSearch(''); setSearchVal(''); setPage(1); }}>Clear</button>}
      </form>

      <div className="card fu" style={{ padding: 0, overflow: 'hidden', animationDelay: '.05s' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading
            ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
            : schools.length === 0
              ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>No schools found</div>
              : <table>
                  <thead>
                    <tr><th>NPSN</th><th>Name</th><th>City</th><th>Province</th><th>Added</th></tr>
                  </thead>
                  <tbody>
                    {schools.map(s => (
                      <tr key={s.id}>
                        <td><span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{s.npsn}</span></td>
                        <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{s.name}</td>
                        <td>{s.city || '—'}</td>
                        <td>{s.province || '—'}</td>
                        <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          }
        </div>
        <Pager page={page} total={total} limit={LIMIT} onChange={setPage} />
      </div>
    </div>
  );
}
