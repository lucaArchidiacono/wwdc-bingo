export default function LeaderboardTable({ rows }) {
  if (!rows || rows.length === 0) return <p className="muted">No cards yet.</p>;
  return (
    <table className="leaderboard">
      <thead>
        <tr>
          <th className="rank">#</th>
          <th>Player</th>
          <th>Hits</th>
          <th className="score">Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r._id || r.username}>
            <td className="rank">{i + 1}</td>
            <td>{r.username}</td>
            <td>{r.itemsHit} / {r.totalItems}</td>
            <td className="score">{r.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
