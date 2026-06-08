import { Router } from 'express';
import { Room } from '../models/Room.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { generateRoomCode, normalizeRoomCode, isValidCustomCode } from '../utils/roomCode.js';

const router = Router();

function publicRoom(r) {
  return {
    id: r._id,
    code: r.code,
    name: r.name,
    status: r.status,
    isPublic: r.isPublic,
    createdAt: r.createdAt,
  };
}

// Public: list joinable public rooms (no auth). Browsable by players.
router.get('/public', async (req, res) => {
  const rooms = await Room.find({ isPublic: true, status: { $in: ['open', 'live'] } })
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    rooms: rooms.map((r) => ({ code: r.code, name: r.name, status: r.status })),
  });
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, isPublic } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name_required' });
  }

  let code;
  if (req.body?.code !== undefined && String(req.body.code).trim() !== '') {
    const custom = normalizeRoomCode(req.body.code);
    if (!isValidCustomCode(custom)) return res.status(400).json({ error: 'invalid_code' });
    const existing = await Room.findOne({ code: custom }).lean();
    if (existing) return res.status(409).json({ error: 'code_taken' });
    code = custom;
  } else {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRoomCode(6);
      const existing = await Room.findOne({ code: candidate }).lean();
      if (!existing) { code = candidate; break; }
    }
    if (!code) return res.status(500).json({ error: 'could_not_generate_code' });
  }

  const room = await Room.create({
    code,
    name: name.trim(),
    createdBy: req.user._id,
    status: 'open',
    isPublic: isPublic === true,
  });
  res.status(201).json({ room: publicRoom(room) });
});

router.get('/', requireAdmin, async (req, res) => {
  const rooms = await Room.find({}).sort({ createdAt: -1 });
  res.json({ rooms: rooms.map(publicRoom) });
});

router.get('/:id', requireAdmin, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'room_not_found' });
  res.json({ room: publicRoom(room) });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const updates = {};
  if (typeof req.body?.name === 'string') updates.name = req.body.name.trim();
  if (['open', 'live', 'closed'].includes(req.body?.status)) updates.status = req.body.status;
  if (typeof req.body?.isPublic === 'boolean') updates.isPublic = req.body.isPublic;
  if (req.body?.code !== undefined) {
    const custom = normalizeRoomCode(req.body.code);
    if (!isValidCustomCode(custom)) return res.status(400).json({ error: 'invalid_code' });
    const clash = await Room.findOne({ code: custom, _id: { $ne: req.params.id } }).lean();
    if (clash) return res.status(409).json({ error: 'code_taken' });
    updates.code = custom;
  }
  const room = await Room.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!room) return res.status(404).json({ error: 'room_not_found' });
  res.json({ room: publicRoom(room) });
});

export default router;
