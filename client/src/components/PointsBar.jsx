export default function PointsBar({ total, target = 24 }) {
  const pct = Math.min(100, (total / target) * 100);
  const cls = total === target ? 'full' : total > target ? 'over' : '';
  return (
    <div className={`points-bar ${cls}`}>
      <strong>{total}</strong>
      <span className="muted">/ {target} pts</span>
      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
      {total > target && <span className="error">over budget</span>}
    </div>
  );
}
