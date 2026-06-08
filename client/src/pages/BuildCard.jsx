import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import ItemPicker from '../components/ItemPicker.jsx';
import PointsBar from '../components/PointsBar.jsx';

export default function BuildCard() {
  const qc = useQueryClient();
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => api.get('/api/catalog') });
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);

  const items = catalog.data?.items || [];
  const total = useMemo(() => {
    const sel = new Set(selected.map(String));
    return items.filter((it) => sel.has(String(it.id))).reduce((s, it) => s + it.points, 0);
  }, [items, selected]);

  function toggle(id) {
    setError(null);
    const key = String(id);
    setSelected((prev) =>
      prev.map(String).includes(key) ? prev.filter((x) => String(x) !== key) : [...prev, id]
    );
  }

  const autofill = useMutation({
    mutationFn: () => api.post('/api/cards/autofill', { itemIds: selected }),
    onSuccess: (data) => setSelected(data.itemIds),
    onError: (e) => {
      if (e.data?.error === 'no_exact_fill') {
        setError(`No exact 24-pt fill from your current selection (sum: ${e.data.sum}). Try removing or adding an item.`);
      } else if (e.data?.error === 'over_budget') {
        setError(`You're already over 24 (${e.data.sum}). Deselect something first.`);
      } else {
        setError(e.message);
      }
    },
  });

  const submit = useMutation({
    mutationFn: () => api.post('/api/cards', { itemIds: selected }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-card'] });
    },
    onError: (e) => setError(prettyError(e.data?.error || e.message)),
  });

  if (catalog.isLoading) return <p>Loading catalog…</p>;
  if (catalog.isError) return <p className="error">Failed to load catalog.</p>;

  if (items.length === 0) {
    return (
      <div>
        <h1>Build your card</h1>
        <p className="muted">The host hasn't added any predictions yet. Check back in a moment.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Build your card</h1>
      <p className="muted">Pick predictions until you hit exactly 24 points. The card locks when submitted.</p>
      <PointsBar total={total} target={24} />
      <div className="row-wrap" style={{ marginTop: 12 }}>
        <button onClick={() => autofill.mutate()} disabled={autofill.isPending || total === 24}>
          {autofill.isPending ? 'Filling…' : 'Auto-fill to 24'}
        </button>
        <button
          className="btn-primary"
          disabled={total !== 24 || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? 'Submitting…' : 'Lock in card'}
        </button>
        {selected.length > 0 && (
          <button className="link-btn" onClick={() => { setSelected([]); setError(null); }}>
            Clear all
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      <ItemPicker items={items} selectedIds={selected} onToggle={toggle} />
    </div>
  );
}

function prettyError(code) {
  switch (code) {
    case 'points_must_total_24': return 'Card must total exactly 24 points.';
    case 'card_already_submitted': return 'You already have a card. Refresh to view it.';
    case 'duplicate_item_ids': return 'Duplicate items in selection.';
    case 'invalid_items_for_room': return 'Some items don\'t belong to this room.';
    default: return code;
  }
}
