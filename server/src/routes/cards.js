import { Router } from 'express';
import mongoose from 'mongoose';
import { Card } from '../models/Card.js';
import { CatalogItem } from '../models/CatalogItem.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { autofillToTarget, TARGET } from '../utils/autofill.js';

const router = Router();

function isValidObjectIdArray(arr) {
  return Array.isArray(arr) && arr.every((id) => mongoose.isValidObjectId(id));
}

router.get('/me', requireAuth, async (req, res) => {
  if (!req.user.roomId) return res.status(400).json({ error: 'not_in_room' });
  const card = await Card.findOne({ userId: req.user._id });
  if (!card) return res.json({ card: null });
  res.json({
    card: {
      id: card._id,
      itemIds: card.itemIds,
      totalPoints: card.totalPoints,
      lockedAt: card.lockedAt,
    },
  });
});

router.post('/', requireAuth, async (req, res) => {
  if (!req.user.roomId) return res.status(400).json({ error: 'not_in_room' });

  const { itemIds } = req.body || {};
  if (!isValidObjectIdArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'item_ids_required' });
  }
  const ids = itemIds.map(String);
  if (new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: 'duplicate_item_ids' });
  }

  const items = await CatalogItem.find({
    _id: { $in: ids },
    roomId: req.user.roomId,
  });
  if (items.length !== ids.length) {
    return res.status(400).json({ error: 'invalid_items_for_room' });
  }
  const total = items.reduce((s, it) => s + it.points, 0);
  if (total !== TARGET) return res.status(400).json({ error: 'points_must_total_24', total });

  const existing = await Card.findOne({ userId: req.user._id });
  if (existing) return res.status(409).json({ error: 'card_already_submitted' });

  try {
    const card = await Card.create({
      userId: req.user._id,
      roomId: req.user.roomId,
      itemIds: ids,
      totalPoints: total,
      lockedAt: new Date(),
    });
    res.status(201).json({
      card: { id: card._id, itemIds: card.itemIds, totalPoints: card.totalPoints, lockedAt: card.lockedAt },
    });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'card_already_submitted' });
    throw e;
  }
});

router.post('/autofill', requireAuth, async (req, res) => {
  if (!req.user.roomId) return res.status(400).json({ error: 'not_in_room' });
  const { itemIds } = req.body || {};
  const selected = Array.isArray(itemIds) ? itemIds.filter((id) => mongoose.isValidObjectId(id)).map(String) : [];

  const catalog = await CatalogItem.find({ roomId: req.user.roomId }).select('_id points');
  const result = autofillToTarget(selected, catalog.map((c) => ({ _id: c._id, points: c.points })));
  if (result.error === 'over_budget') return res.status(400).json({ error: 'over_budget', sum: result.sum });
  if (result.error === 'no_exact_fill') return res.status(409).json({ error: 'no_exact_fill', sum: result.sum });
  res.json({ itemIds: result.itemIds.map(String) });
});

export default router;
