import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export default function AdminDashboard() {
  const qc = useQueryClient();
  const rooms = useQuery({ queryKey: ['admin-rooms'], queryFn: () => api.get('/api/rooms') });
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: () => api.post('/api/rooms', { name: name.trim() }),
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['admin-rooms'] });
    },
  });

  return (
    <div>
      <h1>Admin</h1>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Create a room</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}
          className="row gap-sm"
          style={{ alignItems: 'flex-end' }}
        >
          <div style={{ flex: 1 }}>
            <label>Room name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="WWDC 2026 watch party" />
          </div>
          <button type="submit" className="btn-primary" disabled={!name.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
        {create.isError && <div className="error">{create.error.message}</div>}
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
              <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>{r.status}</div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">No rooms yet.</p>
      )}
    </div>
  );
}
