import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import ItemPicker from '../components/ItemPicker.jsx';

export default function MyCard() {
  const card = useQuery({ queryKey: ['my-card'], queryFn: () => api.get('/api/cards/me') });
  const catalog = useQuery({
    queryKey: ['catalog'],
    queryFn: () => api.get('/api/catalog'),
    refetchInterval: 5000,
  });

  if (card.isLoading || catalog.isLoading) return <p>Loading…</p>;

  const myCard = card.data?.card;
  const items = catalog.data?.items || [];
  if (!myCard) return <p>No card yet.</p>;

  const myIds = new Set(myCard.itemIds.map(String));
  const myItems = items.filter((it) => myIds.has(String(it.id)));
  const score = myItems.filter((it) => it.happened).reduce((s, it) => s + it.points, 0);

  return (
    <div>
      <h1>Your card</h1>
      <div className="panel">
        <div className="row-wrap">
          <div><strong>{score}</strong> <span className="muted">/ 24 pts scored</span></div>
          <div className="muted">·</div>
          <div>{myItems.filter((i) => i.happened).length} / {myItems.length} hit</div>
        </div>
      </div>
      <ItemPicker items={myItems} selectedIds={myCard.itemIds} readOnly showHappened />
    </div>
  );
}
