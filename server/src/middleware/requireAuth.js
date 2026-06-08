import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'unauthenticated' });
  const user = await User.findById(userId);
  if (!user) {
    req.session = null;
    return res.status(401).json({ error: 'unauthenticated' });
  }
  req.user = user;
  next();
}
