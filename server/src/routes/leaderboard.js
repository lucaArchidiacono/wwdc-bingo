import { Router } from 'express';
import mongoose from 'mongoose';
import { Card } from '../models/Card.js';
import { Room } from '../models/Room.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/:id/leaderboard', requireAuth, async (req, res) => {
  const roomId = req.params.id;
  if (!mongoose.isValidObjectId(roomId)) return res.status(400).json({ error: 'bad_room_id' });

  if (!req.user.isAdmin && String(req.user.roomId) !== String(roomId)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const room = await Room.findById(roomId);
  if (!room) return res.status(404).json({ error: 'room_not_found' });

  const rows = await Card.aggregate([
    { $match: { roomId: new mongoose.Types.ObjectId(roomId) } },
    {
      $lookup: {
        from: 'catalogitems',
        let: { ids: '$itemIds' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$ids'] } } },
          { $project: { points: 1, happened: 1 } },
        ],
        as: 'items',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        username: '$user.username',
        totalItems: { $size: '$items' },
        score: {
          $sum: {
            $map: {
              input: '$items',
              as: 'it',
              in: { $cond: ['$$it.happened', '$$it.points', 0] },
            },
          },
        },
        itemsHit: {
          $size: {
            $filter: {
              input: '$items',
              as: 'it',
              cond: '$$it.happened',
            },
          },
        },
      },
    },
    { $sort: { score: -1, username: 1 } },
  ]);

  res.json({ leaderboard: rows });
});

export default router;
