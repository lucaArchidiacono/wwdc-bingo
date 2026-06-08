import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import LeaderboardTable from '../components/LeaderboardTable.jsx';

export default function AdminRoom() {
  const { roomId } = useParams();
  const qc = useQueryClient();
  const room = useQuery({ queryKey: ['admin-room', roomId], queryFn: () => api.get(`/api/rooms/${roomId}`) });
  const catalog = useQuery({
    queryKey: ['admin-catalog', roomId],
    queryFn: () => api.get(`/api/catalog/room/${roomId}`),
    refetchInterval: 5000,
  });
  const lb = useQuery({
    queryKey: ['leaderboard', roomId],
    queryFn: () => api.get(`/api/rooms/${roomId}/leaderboard`),
    refetchInterval: 3000,
  });

  const [label, setLabel] = useState('');
  const [points, setPoints] = useState(1);

  const addItem = useMutation({
    mutationFn: () => api.post(`/api/catalog/room/${roomId}`, { label: label.trim(), points: Number(points) }),
    onSuccess: () => {
      setLabel('');
      setPoints(1);
      qc.invalidateQueries({ queryKey: ['admin-catalog', roomId] });
    },
  });
  const toggleHappened = useMutation({
    mutationFn: ({ id, happened }) =>
      api.patch(`/api/catalog/room/${roomId}/item/${id}`, { happened }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-catalog', roomId] }),
  });
  const deleteItem = useMutation({
    mutationFn: (id) => api.del(`/api/catalog/room/${roomId}/item/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-catalog', roomId] }),
  });

  if (room.isLoading) return <p>Loading…</p>;
  if (room.isError) return <p className="error">Room not found.</p>;

  const r = room.data.room;
  const items = catalog.data?.items || [];
  const cardsExist = lb.data?.leaderboard?.length > 0;

  return (
    <div>
      <p><Link to="/admin">← All rooms</Link></p>
      <h1>{r.name}</h1>
      <p>Code: <span className="code-pill">{r.code}</span> · status: {r.status}</p>

      <h2>Catalog</h2>
      <div className="panel">
        {cardsExist ? (
          <p className="muted" style={{ margin: 0 }}>
            Cards have been submitted — labels &amp; points are locked. You can still mark items as happened.
          </p>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); if (label.trim()) addItem.mutate(); }}
            className="admin-row"
          >
            <div>
              <label>Prediction</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder='Tim Cook says "incredible"' />
            </div>
            <div>
              <label>Points</label>
              <input type="number" min={1} max={24} value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
            <div />
            <button type="submit" className="btn-primary" disabled={!label.trim() || addItem.isPending}>
              {addItem.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}
        {addItem.isError && <div className="error">{addItem.error.message}</div>}
      </div>

      <div className="item-list">
        {items.map((it) => (
          <div key={it.id} className={`item ${it.happened ? 'happened' : ''}`} style={{ cursor: 'default' }}>
            <input
              type="checkbox"
              checked={it.happened}
              onChange={(e) => toggleHappened.mutate({ id: it.id, happened: e.target.checked })}
              title="Mark as happened"
            />
            <span className="label">{it.label}</span>
            <span className="points">{it.points} pt{it.points === 1 ? '' : 's'}</span>
            {!cardsExist && (
              <button
                className="link-btn"
                style={{ color: 'var(--bad)' }}
                onClick={() => { if (confirm(`Delete "${it.label}"?`)) deleteItem.mutate(it.id); }}
              >
                delete
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="muted">No items yet.</p>}
      </div>

      <h2>Leaderboard</h2>
      <div className="panel">
        <LeaderboardTable rows={lb.data?.leaderboard || []} />
      </div>
    </div>
  );
}
