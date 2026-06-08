import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { useMe } from '../auth.js';
import LeaderboardTable from '../components/LeaderboardTable.jsx';

export default function Leaderboard() {
  const me = useMe();
  const roomId = me.data?.room?.id;
  const lb = useQuery({
    queryKey: ['leaderboard', roomId],
    queryFn: () => api.get(`/api/rooms/${roomId}/leaderboard`),
    enabled: !!roomId,
    refetchInterval: 3000,
  });

  if (!roomId) return <p>Not in a room.</p>;
  if (lb.isLoading) return <p>Loading…</p>;

  return (
    <div>
      <h1>Leaderboard</h1>
      <p className="muted">Updates every 3 seconds.</p>
      <div className="panel">
        <LeaderboardTable rows={lb.data?.leaderboard || []} />
      </div>
    </div>
  );
}
