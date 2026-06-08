import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieSession from 'cookie-session';
import { connectDb } from './db.js';
import authRouter from './routes/auth.js';
import roomsRouter from './routes/rooms.js';
import catalogRouter from './routes/catalog.js';
import cardsRouter from './routes/cards.js';
import leaderboardRouter from './routes/leaderboard.js';

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wwdc-bingo';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret';

await connectDb(MONGODB_URI);

const app = express();

app.use(express.json({ limit: '64kb' }));
app.use(
  cookieSession({
    name: 'wbsess',
    secret: SESSION_SECRET,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
);

app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/rooms', leaderboardRouter);

// Serve built client (single-origin) with SPA fallback
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, req, res, _next) => {
  if (err && err.status) return res.status(err.status).json({ error: err.message });
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
