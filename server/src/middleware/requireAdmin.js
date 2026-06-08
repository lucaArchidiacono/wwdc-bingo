import { requireAuth } from './requireAuth.js';

export function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'admin_only' });
    next();
  });
}
