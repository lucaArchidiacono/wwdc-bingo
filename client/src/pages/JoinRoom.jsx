import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export default function JoinRoom() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const qc = useQueryClient();
  const publicRooms = useQuery({
    queryKey: ['public-rooms'],
    queryFn: () => api.get('/api/rooms/public'),
  });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post('/api/auth/join-room', {
        username: username.trim(),
        roomCode: roomCode.trim().toUpperCase(),
      });
      await qc.invalidateQueries({ queryKey: ['me'] });
      nav(`/room/${data.room.code}/card`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Join a room</h1>
      <form className="panel" onSubmit={submit}>
        <label>Your display name</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="alice" required />
        <label>Room code</label>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="K7QF2P"
          maxLength={6}
          style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.15em' }}
          required
        />
        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Joining…' : 'Join'}
          </button>
        </div>
        {error && <div className="error">{prettyError(error)}</div>}
      </form>

      {publicRooms.data?.rooms?.length > 0 && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Public rooms</h2>
          <p className="muted" style={{ marginTop: 0 }}>Pick one to fill in its code.</p>
          <div className="item-list">
            {publicRooms.data.rooms.map((r) => (
              <button
                key={r.code}
                className="item public-room-row"
                onClick={() => setRoomCode(r.code)}
              >
                <span className="label">{r.name}</span>
                {r.status === 'live' && <span className="ok">● live</span>}
                <span className="code-pill">{r.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function prettyError(code) {
  switch (code) {
    case 'room_not_found': return 'No room with that code.';
    case 'username_taken': return 'That name is already taken in this room.';
    case 'username_required': return 'Please enter a display name.';
    case 'room_code_required': return 'Please enter a room code.';
    default: return code;
  }
}
