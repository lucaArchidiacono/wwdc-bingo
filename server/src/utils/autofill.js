const TARGET = 24;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Find a subset of `candidates` whose points sum to exactly `need`.
 * candidates: [{ _id, points }]. Returns array of _id or null if impossible.
 */
export function findSubsetForExact(candidates, need) {
  if (need === 0) return [];
  if (need < 0) return null;
  const items = shuffle(candidates).filter((c) => c.points > 0 && c.points <= need);
  if (items.length === 0) return null;

  // dp[s] = index in items used to reach sum s; prev[s] = previous sum before using that item.
  const dp = new Array(need + 1).fill(-1);
  const prev = new Array(need + 1).fill(-1);
  dp[0] = -2;

  for (let i = 0; i < items.length; i++) {
    const p = items[i].points;
    for (let s = need; s >= p; s--) {
      if (dp[s] === -1 && dp[s - p] !== -1) {
        dp[s] = i;
        prev[s] = s - p;
      }
    }
    if (dp[need] !== -1) break;
  }

  if (dp[need] === -1) return null;

  const ids = [];
  let s = need;
  while (s > 0) {
    const i = dp[s];
    ids.push(items[i]._id);
    s = prev[s];
  }
  return ids;
}

export function autofillToTarget(selectedIds, allCatalog) {
  const selectedSet = new Set(selectedIds.map(String));
  const selected = allCatalog.filter((c) => selectedSet.has(String(c._id)));
  const remaining = allCatalog.filter((c) => !selectedSet.has(String(c._id)));
  const sum = selected.reduce((acc, c) => acc + c.points, 0);
  if (sum > TARGET) return { error: 'over_budget', sum };
  if (sum === TARGET) return { itemIds: selectedIds };
  const need = TARGET - sum;
  const filler = findSubsetForExact(remaining, need);
  if (!filler) return { error: 'no_exact_fill', sum };
  return { itemIds: [...selectedIds, ...filler.map(String)] };
}

export { TARGET };
