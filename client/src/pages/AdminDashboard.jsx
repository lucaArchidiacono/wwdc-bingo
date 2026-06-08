import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export default function AdminDashboard() {
  const qc = useQueryClient();
  const rooms = useQuery({ queryKey: ['admin-rooms'], queryFn: () => api.get('/api/rooms') });
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const create = useMutation({
    mutationFn: () =>
      api.post('/api/rooms', {
        name: name.trim(),
        code: code.trim() || undefined,
        isPublic,
      }),
    onSuccess: () => {
      setName('');
      setCode('');
      setIsPublic(false);
      qc.invalidateQueries({ queryKey: ['admin-rooms'] });
    },
  });

  return (
    <div>
      <h1>Admin</h1>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Create a room</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}>
          <div className="row gap-sm" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label>Room name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="WWDC 2026 watch party" />
            </div>
            <div style={{ width: 160 }}>
              <label>Custom code (optional)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="auto"
                maxLength={12}
                style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em' }}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={!name.trim() || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
          <label className="checkbox-row" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span>Public — listed for anyone to browse and join. Leave off to keep it code-only (private).</span>
          </label>
        </form>
        {create.isError && <div className="error">{prettyError(create.error.message)}</div>}
        <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
          Codes are 4–12 letters/digits. Leave blank to auto-generate.
        </p>
      </div>

      <h2>Rooms</h2>
      {rooms.isLoading ? (
        <p>Loading…</p>
      ) : rooms.data?.rooms?.length ? (
        <div className="room-grid">
          {rooms.data.rooms.map((r) => (
            <Link to={`/admin/rooms/${r.id}`} key={r.id} className="room-card">
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div style={{ marginTop: 8 }}><span className="code-pill">{r.code}</span></div>
              <div className="muted row gap-sm" style={{ marginTop: 8, fontSize: 13 }}>
                <span>{r.status}</span>
                <span>·</span>
                <span className={`tag ${r.isPublic ? 'tag-public' : ''}`}>{r.isPublic ? 'public' : 'private'}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">No rooms yet.</p>
      )}
    </div>
  );
}

function prettyError(code) {
  switch (code) {
    case 'invalid_code': return 'Code must be 4–12 letters or digits.';
    case 'code_taken': return 'That code is already in use. Try another.';
    case 'name_required': return 'Please enter a room name.';
    default: return code;
  }
}
