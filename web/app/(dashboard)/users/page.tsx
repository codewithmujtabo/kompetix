'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import type { User } from '@/types';
import { PageHeader, Spinner, Toast, Pager } from '@/components/ui';

const ROLES = ['', 'student', 'parent', 'teacher', 'school_admin', 'admin'];
const ROLE_CLS: Record<string, string> = {
  admin: 'badge-red', school_admin: 'badge-indigo',
  teacher: 'badge-yellow', student: 'badge-green', parent: 'badge-gray',
};

export default function Users() {
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [role, setRole]           = useState('');
  const [search, setSearch]       = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [msg, setMsg]             = useState<{ ok: boolean; text: string } | null>(null);
  const LIMIT = 25;

  const load = async () => {
    setLoading(true);
    try {
      const r = await usersApi.list({ page, limit: LIMIT, role: role || undefined, search: search || undefined });
      setUsers(r?.users ?? []); setTotal(r?.pagination?.total ?? 0);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, role, search]);

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      <PageHeader sub="Management" title="Users" count={total} />
      {msg && <Toast ok={msg.ok} msg={msg.text} />}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <form onSubmit={e => { e.preventDefault(); setSearch(searchVal); setPage(1); }} style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ width: 260 }} placeholder="Name or email…" value={searchVal} onChange={e => setSearchVal(e.target.value)} />
          <button className="btn btn-ghost" type="submit">Search</button>
          {search && <button className="btn btn-ghost" type="button" onClick={() => { setSearch(''); setSearchVal(''); setPage(1); }}>Clear</button>}
        </form>
        <div style={{ display: 'flex', gap: 5 }}>
          {ROLES.map(r => (
            <button key={r} className={`btn ${role === r ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setRole(r); setPage(1); }} style={{ padding: '5px 12px', fontSize: 12 }}>
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card fu" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading
            ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
            : users.length === 0
              ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>No users found</div>
              : <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Joined</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{u.full_name || '—'}</td>
                        <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{u.email}</td>
                        <td><span className={`badge ${ROLE_CLS[u.role] ?? 'badge-gray'}`}>{u.role}</span></td>
                        <td>{u.city || '—'}</td>
                        <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
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
