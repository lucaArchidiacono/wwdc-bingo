import { Router } from 'express';
import { CatalogItem } from '../models/CatalogItem.js';
import { Card } from '../models/Card.js';
import { Room } from '../models/Room.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

function publicItem(it) {
  return {
    id: it._id,
    label: it.label,
    points: it.points,
    imageUrl: it.imageUrl || '',
    happened: it.happened,
    occurredAt: it.occurredAt,
  };
}

// Returns the normalized image URL, or undefined if the value is invalid.
// Empty string clears the image. Only http(s) URLs are accepted.
function normalizeImageUrl(raw) {
  if (raw === undefined) return undefined;
  const s = String(raw).trim();
  if (s === '') return '';
  if (s.length > 2000) return undefined;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return s;
  } catch {
    return undefined;
  }
}

// Player: list catalog for the user's room.
router.get('/', requireAuth, async (req, res) => {
  if (!req.user.roomId) return res.status(400).json({ error: 'not_in_room' });
  const items = await CatalogItem.find({ roomId: req.user.roomId }).sort({ createdAt: 1 });
  res.json({ items: items.map(publicItem) });
});

// Admin: list catalog for any room.
router.get('/room/:roomId', requireAdmin, async (req, res) => {
  const items = await CatalogItem.find({ roomId: req.params.roomId }).sort({ createdAt: 1 });
  res.json({ items: items.map(publicItem) });
});

// Admin: create item. Blocked once any card is submitted in the room.
router.post('/room/:roomId', requireAdmin, async (req, res) => {
  const { label, points } = req.body || {};
  if (!label || typeof label !== 'string' || !label.trim()) {
    return res.status(400).json({ error: 'label_required' });
  }
  const p = Number(points);
  if (!Number.isInteger(p) || p < 1 || p > 24) {
    return res.status(400).json({ error: 'points_must_be_1_to_24' });
  }
  const imageUrl = normalizeImageUrl(req.body?.imageUrl);
  if (imageUrl === undefined && req.body?.imageUrl !== undefined) {
    return res.status(400).json({ error: 'invalid_image_url' });
  }
  const room = await Room.findById(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'room_not_found' });

  const cardCount = await Card.countDocuments({ roomId: room._id });
  if (cardCount > 0) return res.status(409).json({ error: 'catalog_locked_cards_exist' });

  const item = await CatalogItem.create({
    roomId: room._id,
    label: label.trim(),
    points: p,
    imageUrl: imageUrl || '',
    happened: false,
  });
  res.status(201).json({ item: publicItem(item) });
});

// Admin: edit item. Label/points blocked after first card. `happened` always allowed.
router.patch('/room/:roomId/item/:itemId', requireAdmin, async (req, res) => {
  const item = await CatalogItem.findOne({ _id: req.params.itemId, roomId: req.params.roomId });
  if (!item) return res.status(404).json({ error: 'item_not_found' });

  const wantsStructural =
    typeof req.body?.label === 'string' || req.body?.points !== undefined;

  if (wantsStructural) {
    const cardCount = await Card.countDocuments({ roomId: item.roomId });
    if (cardCount > 0) return res.status(409).json({ error: 'catalog_locked_cards_exist' });
    if (typeof req.body.label === 'string') item.label = req.body.label.trim();
    if (req.body.points !== undefined) {
      const p = Number(req.body.points);
      if (!Number.isInteger(p) || p < 1 || p > 24) {
        return res.status(400).json({ error: 'points_must_be_1_to_24' });
      }
      item.points = p;
    }
  }

  // Image edits are non-structural (they don't affect scoring), so allowed anytime.
  if (req.body?.imageUrl !== undefined) {
    const imageUrl = normalizeImageUrl(req.body.imageUrl);
    if (imageUrl === undefined) return res.status(400).json({ error: 'invalid_image_url' });
    item.imageUrl = imageUrl;
  }

  if (typeof req.body?.happened === 'boolean') {
    item.happened = req.body.happened;
    item.occurredAt = req.body.happened ? new Date() : null;
  }

  await item.save();
  res.json({ item: publicItem(item) });
});

// Admin: delete item. Blocked once cards exist.
router.delete('/room/:roomId/item/:itemId', requireAdmin, async (req, res) => {
  const item = await CatalogItem.findOne({ _id: req.params.itemId, roomId: req.params.roomId });
  if (!item) return res.status(404).json({ error: 'item_not_found' });
  const cardCount = await Card.countDocuments({ roomId: item.roomId });
  if (cardCount > 0) return res.status(409).json({ error: 'catalog_locked_cards_exist' });
  await item.deleteOne();
  res.status(204).end();
});

export default router;
