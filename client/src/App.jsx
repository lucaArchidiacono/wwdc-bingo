import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from './api.js';
import { useMe, useLogout } from './auth.js';
import Landing from './pages/Landing.jsx';
import JoinRoom from './pages/JoinRoom.jsx';
import BuildCard from './pages/BuildCard.jsx';
import MyCard from './pages/MyCard.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRoom from './pages/AdminRoom.jsx';

export default function App() {
  const me = useMe();
  const logout = useLogout();
  const user = me.data?.user;
  const room = me.data?.room;

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">🎟️ Keynote Bingo</Link>
        <nav>
          {user?.isAdmin && <Link to="/admin">Admin</Link>}
          {user && !user.isAdmin && room && <Link to={`/room/${room.code}/card`}>My card</Link>}
          {user && room && <Link to={`/room/${room.code}/leaderboard`}>Leaderboard</Link>}
          {user && (
            <button className="link-btn" onClick={async () => { await logout(); window.location.href = '/'; }}>
              Log out ({user.username})
            </button>
          )}
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Landing user={user} room={room} />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={user?.isAdmin ? <AdminDashboard /> : <Navigate to="/admin/login" />} />
          <Route path="/admin/rooms/:roomId" element={user?.isAdmin ? <AdminRoom /> : <Navigate to="/admin/login" />} />
          <Route path="/room/:code/card" element={user && room ? <CardGate /> : <Navigate to="/join" />} />
          <Route path="/room/:code/leaderboard" element={user && room ? <Leaderboard /> : <Navigate to="/join" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function CardGate() {
  const card = useQuery({ queryKey: ['my-card'], queryFn: () => api.get('/api/cards/me') });
  if (card.isLoading) return <p>Loading…</p>;
  if (card.data?.card) return <MyCard />;
  return <BuildCard />;
}
