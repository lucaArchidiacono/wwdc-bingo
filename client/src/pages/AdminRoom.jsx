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
  const [imageUrl, setImageUrl] = useState('');

  const addItem = useMutation({
    mutationFn: () =>
      api.post(`/api/catalog/room/${roomId}`, {
        label: label.trim(),
        points: Number(points),
        imageUrl: imageUrl.trim() || undefined,
      }),
    onSuccess: () => {
      setLabel('');
      setPoints(1);
      setImageUrl('');
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

      <RoomSettings room={r} roomId={roomId} />

      <h2>Catalog</h2>
      <div className="panel">
        {cardsExist ? (
          <p className="muted" style={{ margin: 0 }}>
            Cards have been submitted — labels &amp; points are locked. You can still mark items as
            happened and change their images.
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
            <div className="admin-row-image">
              <label>Image URL (optional)</label>
              <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>
            <button type="submit" className="btn-primary" disabled={!label.trim() || addItem.isPending}>
              {addItem.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}
        {addItem.isError && <div className="error">{prettyError(addItem.error.message)}</div>}
      </div>

      <div className="item-list">
        {items.map((it) => (
          <AdminItem
            key={it.id}
            item={it}
            roomId={roomId}
            locked={cardsExist}
            onToggle={(happened) => toggleHappened.mutate({ id: it.id, happened })}
            onDelete={() => { if (confirm(`Delete "${it.label}"?`)) deleteItem.mutate(it.id); }}
          />
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

function RoomSettings({ room, roomId }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(room.code);
  const update = useMutation({
    mutationFn: (body) => api.patch(`/api/rooms/${roomId}`, body),
    onSuccess: (data) => {
      setCode(data.room.code);
      qc.invalidateQueries({ queryKey: ['admin-room', roomId] });
      qc.invalidateQueries({ queryKey: ['admin-rooms'] });
    },
  });

  const codeDirty = code.trim().toUpperCase() !== room.code;

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Room settings</h2>
      <div className="row-wrap" style={{ alignItems: 'flex-end' }}>
        <div>
          <label>Room code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={12}
            style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em', width: 180 }}
          />
        </div>
        <button
          onClick={() => update.mutate({ code: code.trim() })}
          disabled={!codeDirty || update.isPending}
        >
          Save code
        </button>
        <div className="muted">status: {room.status}</div>
      </div>

      <label className="checkbox-row" style={{ marginTop: 16 }}>
        <input
          type="checkbox"
          checked={room.isPublic}
          onChange={(e) => update.mutate({ isPublic: e.target.checked })}
          disabled={update.isPending}
        />
        <span>
          Public — <span className={`tag ${room.isPublic ? 'tag-public' : ''}`}>{room.isPublic ? 'public' : 'private'}</span>{' '}
          {room.isPublic
            ? 'listed for anyone to browse and join.'
            : 'code-only; not listed anywhere.'}
        </span>
      </label>
      {update.isError && <div className="error">{prettyError(update.error.message)}</div>}
    </div>
  );
}

function AdminItem({ item, roomId, locked, onToggle, onDelete }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [points, setPoints] = useState(item.points);
  const [imageUrl, setImageUrl] = useState(item.imageUrl || '');

  const save = useMutation({
    mutationFn: () => {
      const body = { imageUrl: imageUrl.trim() };
      if (!locked) {
        body.label = label.trim();
        body.points = Number(points);
      }
      return api.patch(`/api/catalog/room/${roomId}/item/${item.id}`, body);
    },
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['admin-catalog', roomId] });
    },
  });

  if (editing) {
    return (
      <div className="item item-editing">
        <div className="item-edit-fields">
          <div>
            <label>Prediction</label>
            <input type="text" value={label} disabled={locked} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div style={{ width: 90 }}>
            <label>Points</label>
            <input type="number" min={1} max={24} value={points} disabled={locked} onChange={(e) => setPoints(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Image URL</label>
            <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <div className="row gap-sm" style={{ marginTop: 8 }}>
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending || (!locked && !label.trim())}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button className="link-btn" onClick={() => {
            setEditing(false);
            setLabel(item.label); setPoints(item.points); setImageUrl(item.imageUrl || '');
          }}>cancel</button>
          {locked && <span className="muted" style={{ fontSize: 12 }}>Text &amp; points locked — image still editable.</span>}
        </div>
        {save.isError && <div className="error">{prettyError(save.error.message)}</div>}
      </div>
    );
  }

  return (
    <div className={`item ${item.happened ? 'happened' : ''}`} style={{ cursor: 'default' }}>
      <input
        type="checkbox"
        checked={item.happened}
        onChange={(e) => onToggle(e.target.checked)}
        title="Mark as happened"
      />
      {item.imageUrl && <img className="item-thumb" src={item.imageUrl} alt="" />}
      <span className="label">{item.label}</span>
      <span className="points">{item.points} pt{item.points === 1 ? '' : 's'}</span>
      <button className="link-btn" onClick={() => setEditing(true)}>edit</button>
      {!locked && (
        <button className="link-btn" style={{ color: 'var(--bad)' }} onClick={onDelete}>
          delete
        </button>
      )}
    </div>
  );
}

function prettyError(code) {
  switch (code) {
    case 'invalid_code': return 'Code must be 4–12 letters or digits.';
    case 'code_taken': return 'That code is already in use. Try another.';
    case 'invalid_image_url': return 'Image must be a valid http(s) URL.';
    case 'points_must_be_1_to_24': return 'Points must be a whole number from 1 to 24.';
    case 'catalog_locked_cards_exist': return 'Cards exist — text and points are locked.';
    default: return code;
  }
}
