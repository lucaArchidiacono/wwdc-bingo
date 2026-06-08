import { Router } from 'express';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { normalizeRoomCode } from '../utils/roomCode.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function publicUser(u) {
  return { id: u._id, username: u.username, isAdmin: u.isAdmin, roomId: u.roomId };
}

router.post('/admin-signup', async (req, res) => {
  const { username, bootstrapToken } = req.body || {};
  const expected = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!expected) return res.status(500).json({ error: 'admin_token_not_configured' });
  if (!username || typeof username !== 'string') return res.status(400).json({ error: 'username_required' });
  if (!safeEqual(bootstrapToken || '', expected)) return res.status(401).json({ error: 'bad_token' });

  const trimmed = username.trim();
  if (!trimmed) return res.status(400).json({ error: 'username_required' });

  let user = await User.findOne({ username: trimmed, isAdmin: true });
  if (!user) user = await User.create({ username: trimmed, isAdmin: true, roomId: null });

  req.session.userId = String(user._id);
  res.json({ user: publicUser(user) });
});

router.post('/join-room', async (req, res) => {
  const { username, roomCode } = req.body || {};
  if (!username || typeof username !== 'string') return res.status(400).json({ error: 'username_required' });
  const code = normalizeRoomCode(roomCode);
  if (!code) return res.status(400).json({ error: 'room_code_required' });

  const room = await Room.findOne({ code });
  if (!room) return res.status(404).json({ error: 'room_not_found' });

  const trimmed = username.trim();
  if (!trimmed) return res.status(400).json({ error: 'username_required' });

  let user = await User.findOne({ roomId: room._id, username: trimmed });
  if (!user) {
    try {
      user = await User.create({ username: trimmed, isAdmin: false, roomId: room._id });
    } catch (e) {
      if (e?.code === 11000) return res.status(409).json({ error: 'username_taken' });
      throw e;
    }
  }

  req.session.userId = String(user._id);
  res.json({ user: publicUser(user), room: { id: room._id, code: room.code, name: room.name, status: room.status } });
});

router.get('/me', requireAuth, async (req, res) => {
  let room = null;
  if (req.user.roomId) {
    const r = await Room.findById(req.user.roomId);
    if (r) room = { id: r._id, code: r.code, name: r.name, status: r.status };
  }
  res.json({ user: publicUser(req.user), room });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.status(204).end();
});

export default router;
