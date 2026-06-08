import { Link } from 'react-router-dom';

export default function Landing({ user, room }) {
  return (
    <div>
      <h1>Keynote Bingo</h1>
      <p className="muted">
        Build a 24-point card of predictions. Watch them come true. Win.
      </p>

      {user && room && !user.isAdmin && (
        <div className="panel">
          <p>You're in <strong>{room.name}</strong> (<span className="code-pill">{room.code}</span>) as <strong>{user.username}</strong>.</p>
          <div className="row gap-sm">
            <Link to={`/room/${room.code}/card`} className="btn btn-primary">Open my card</Link>
            <Link to={`/room/${room.code}/leaderboard`} className="btn">Leaderboard</Link>
          </div>
        </div>
      )}

      {user?.isAdmin && (
        <div className="panel">
          <p>Logged in as admin <strong>{user.username}</strong>.</p>
          <Link to="/admin" className="btn btn-primary">Open admin panel</Link>
        </div>
      )}

      {!user && (
        <div className="panel">
          <h2>Join a room</h2>
          <p className="muted">Got a room code from your host? Jump in.</p>
          <Link to="/join" className="btn btn-primary">Join with a code</Link>
          <div style={{ marginTop: 24 }}>
            <Link to="/admin/login" className="muted">Admin login →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
