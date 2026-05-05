'use client';

import { useState, useEffect } from 'react';
import { schoolsApi, competitionsApi, notificationsApi } from '@/lib/api';
import type { School, Competition } from '@/types';
import { PageHeader, Spinner, Toast } from '@/components/ui';

export default function Notifications() {
  const [allSchools, setAllSchools]   = useState<School[]>([]);
  const [allComps, setAllComps]       = useState<Competition[]>([]);
  const [provinces, setProvinces]     = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [province, setProvince]         = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [compId, setCompId]             = useState('');
  const [title, setTitle]               = useState('');
  const [body, setBody]                 = useState('');
  const [type, setType]                 = useState('competition_announcement');
  const [scheduled, setScheduled]       = useState('');
  const [sending, setSending]           = useState(false);
  const [msg, setMsg]                   = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      schoolsApi.list({ limit: 500 }),
      competitionsApi.list({ limit: 200 }),
      schoolsApi.provinces(),
    ]).then(([s, c, p]) => {
  
      setAllSchools(Array.isArray(s?.schools) ? s.schools : []);
      setAllComps(Array.isArray(c?.competitions) ? c.competitions : []);
      setProvinces(Array.isArray(p) ? p : []);
    }).catch(err => {
      console.error('Failed to load data:', err);
      setAllSchools([]);
      setAllComps([]);
      setProvinces([]);
    }).finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (!compId) return;
    const c = allComps?.find(x => x.id === compId);
    if (!c) return;
    setTitle(`📢 ${c.name}`);
    const close = c.reg_close_date
      ? ` Registration closes ${new Date(c.reg_close_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`
      : '';
    setBody(`${c.organizer_name} is opening registration for ${c.name}.${close} Category: ${c.category || 'General'}.`);
  }, [compId, allComps]);

  const visible = allSchools?.filter(s => {
    const matchProvince = !province || s.province === province;
    const matchSearch   = !schoolSearch
      || s.name.toLowerCase().includes(schoolSearch.toLowerCase())
      || (s.city ?? '').toLowerCase().includes(schoolSearch.toLowerCase());
    return matchProvince && matchSearch;
  }) || [];

  const toggle    = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(visible.map(s => s.id)));
  const clearAll  = () => setSelected(new Set());

  const send = async () => {
    if (!title || !body || selected.size === 0) return;
    setSending(true); setMsg(null);
    try {
      const r = await notificationsApi.broadcast({
        title, body, type,
        school_ids: [...selected],
        competition_id: compId || undefined,
        scheduled_for:  scheduled || undefined,
      });
      setMsg({ ok: true, text: r.message });
      setSelected(new Set()); setCompId(''); setTitle(''); setBody(''); setScheduled('');
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setSending(false); }
  };

  if (loadingData) return (
    <div style={{ padding: 40, display: 'flex', gap: 12, alignItems: 'center' }}>
      <Spinner /><span style={{ color: 'var(--text-3)' }}>Loading…</span>
    </div>
  );

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <PageHeader sub="Broadcast" title="Send Notification" />
      {msg && <Toast ok={msg.ok} msg={msg.text} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
        {/* School selector */}
        <div className="card fu">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span className="label" style={{ margin: 0 }}>Target Schools</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {selected.size > 0 && <span className="badge badge-indigo">{selected.size} selected</span>}
              <button className="btn btn-ghost" onClick={selectAll} style={{ padding: '4px 10px', fontSize: 11 }}>All</button>
              <button className="btn btn-ghost" onClick={clearAll}  style={{ padding: '4px 10px', fontSize: 11 }}>Clear</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input className="input" placeholder="Search…" value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)} style={{ flex: 1 }} />
            <select className="input" value={province} onChange={e => setProvince(e.target.value)} style={{ width: 170 }}>
              <option value="">All provinces</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {visible.length === 0
              ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>No schools match</div>
              : visible.map(s => {
                  const on = selected.has(s.id);
                  return (
                    <div key={s.id} onClick={() => toggle(s.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                      background: on ? 'var(--accent-dim)' : 'transparent',
                      border: `1px solid ${on ? 'rgba(99,102,241,.3)' : 'transparent'}`,
                      transition: 'all var(--ease)',
                    }}>
                      <div style={{
                        width: 17, height: 17, borderRadius: 4, flexShrink: 0,
                        background: on ? 'var(--accent)' : 'var(--bg-elevated)',
                        border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border-light)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#fff', transition: 'all var(--ease)',
                      }}>{on && '✓'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--text-1)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-mono)' }}>{[s.city, s.province].filter(Boolean).join(', ') || s.npsn}</div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card fu" style={{ animationDelay: '.06s' }}>
            <span className="label" style={{ display: 'block', marginBottom: 18 }}>Message</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label className="label">Competition (optional)</label>
                <select className="input" value={compId} onChange={e => setCompId(e.target.value)}>
                  <option value="">— choose —</option>
                  {}
                  {allComps?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={type} onChange={e => setType(e.target.value)}>
                  <option value="competition_announcement">Competition Announcement</option>
                  <option value="deadline_reminder">Deadline Reminder</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div><label className="label">Title *</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" /></div>
              <div><label className="label">Message *</label><textarea className="input" value={body} onChange={e => setBody(e.target.value)} placeholder="Message body…" /></div>
              <div><label className="label">Schedule (optional)</label><input className="input" type="datetime-local" value={scheduled} onChange={e => setScheduled(e.target.value)} /></div>
            </div>
          </div>

          {(title || body) && (
            <div className="card fi" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', padding: 16 }}>
              <span className="label" style={{ display: 'block', marginBottom: 10 }}>Preview</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,var(--accent),#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✦</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{title || 'Title…'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{body || 'Message…'}</div>
                </div>
              </div>
            </div>
          )}

          <button className="btn btn-primary" onClick={send}
            disabled={sending || !title || !body || selected.size === 0}
            style={{ justifyContent: 'center', padding: '13px', fontSize: 14 }}>
            {sending ? <><Spinner />&nbsp;Sending…</> : `📣 Send to ${selected.size} school${selected.size !== 1 ? 's' : ''}`}
          </button>
          {selected.size === 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', fontFamily: 'var(--ff-mono)' }}>Select at least one school</p>
          )}
        </div>
      </div>
    </div>
  );
}