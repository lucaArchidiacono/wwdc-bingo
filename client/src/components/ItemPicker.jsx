export default function ItemPicker({ items, selectedIds, onToggle, readOnly = false, showHappened = false }) {
  const sel = new Set(selectedIds.map(String));
  return (
    <div className="item-list">
      {items.map((it) => {
        const selected = sel.has(String(it.id));
        const cls = ['item'];
        if (selected) cls.push('selected');
        if (showHappened && it.happened) cls.push('happened');
        return (
          <label key={it.id} className={cls.join(' ')}>
            <input
              type="checkbox"
              checked={selected}
              disabled={readOnly}
              onChange={() => onToggle?.(it.id)}
            />
            {it.imageUrl && <img className="item-thumb" src={it.imageUrl} alt="" />}
            <span className="label">
              {it.label}
              {showHappened && it.happened && <span className="ok"> ✓ happened</span>}
            </span>
            <span className="points">{it.points} pt{it.points === 1 ? '' : 's'}</span>
          </label>
        );
      })}
    </div>
  );
}
