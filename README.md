# WWDC Keynote Bingo

A small watch-party app where attendees build a 24-point bingo card of keynote predictions. An admin marks predictions as they happen and a live leaderboard ranks players by points.

See [specs.md](./specs.md) for the full design.

## Setup

Requires Node 18+ and a running MongoDB instance (local `mongod` or an Atlas connection string).

```bash
# Install deps for root, server, and client
npm run install:all

# Configure server env
cp server/.env.example server/.env
# edit server/.env: MONGODB_URI, SESSION_SECRET, ADMIN_BOOTSTRAP_TOKEN

# Run both server (:4000) and client (:5173)
npm run dev
```

Then open http://localhost:5173.

## First-time admin setup

1. Visit `/admin/login`
2. Enter any username + the `ADMIN_BOOTSTRAP_TOKEN` from `server/.env`
3. You're now an admin — create a room, add catalog items, share the room code
