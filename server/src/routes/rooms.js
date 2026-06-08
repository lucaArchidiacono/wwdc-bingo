import { Router } from 'express';
import { Room } from '../models/Room.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { generateRoomCode } from '../utils/roomCode.js';

const router = Router();

function publicRoom(r) {
  return { id: r._id, code: r.code, name: r.name, status: r.status, createdAt: r.createdAt };
}

router.post('/', requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name_required' });
  }

  let code;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRoomCode(6);
    const existing = await Room.findOne({ code: candidate }).lean();
    if (!existing) { code = candidate; break; }
  }
  if (!code) return res.status(500).json({ error: 'could_not_generate_code' });

  const room = await Room.create({
    code,
    name: name.trim(),
    createdBy: req.user._id,
    status: 'open',
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
  const room = await Room.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!room) return res.status(404).json({ error: 'room_not_found' });
  res.json({ room: publicRoom(room) });
});

export default router;
