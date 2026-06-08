# WWDC Keynote Bingo — Specification

## Context

Watch-party web app for an upcoming Apple keynote. Attendees join a room, build a "bingo card" of predictions worth exactly **24 points**, and during the event an admin marks predictions as they happen. A live leaderboard ranks players by total points scored.

Scope: a single, low-ceremony app for a one-off event, hostable on any Node-friendly platform.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite, plain JS), react-router, TanStack Query |
| Backend | Node + Express + Mongoose |
| Database | MongoDB (local `mongod` or Atlas) |
| Auth | Username + room code (players); `ADMIN_BOOTSTRAP_TOKEN` (admins). Cookie session. No passwords. |
| Realtime | Polling every 3s (no websockets) |

## Decisions

- **Card format**: free-form list — pick any items totaling exactly 24 pts. **Auto-fill to 24** button uses subset-sum DP.
- **Admin**: `isAdmin` flag on User. First admin signs up with the env-var bootstrap token.
- **Rooms**: multiple rooms; admin creates them. Each room owns its own catalog + leaderboard.
- **Catalog**: managed in the admin panel (CRUD per room). Locked once the first card is submitted (no point-value rugpulls). `happened` toggles remain editable.
- **Ranking**: pure points sum — total points of items on a user's card whose `happened=true`.

## Repo layout

```
wwdc-bingo/
├── specs.md
├── README.md
├── package.json              # root scripts: dev (concurrently runs client+server)
├── server/
│   ├── package.json
│   ├── .env.example          # MONGODB_URI, SESSION_SECRET, ADMIN_BOOTSTRAP_TOKEN, PORT
│   └── src/
│       ├── index.js          # express app, cookie-session, mounts routes
│       ├── db.js             # mongoose connect
│       ├── models/
│       │   ├── User.js
│       │   ├── Room.js
│       │   ├── CatalogItem.js
│       │   └── Card.js
│       ├── middleware/
│       │   ├── requireAuth.js
│       │   └── requireAdmin.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── rooms.js
│       │   ├── catalog.js
│       │   ├── cards.js
│       │   └── leaderboard.js
│       └── utils/
│           └── autofill.js   # subset-sum DP
└── client/
    ├── package.json
    ├── vite.config.js        # dev proxy /api → :4000
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx           # router
        ├── api.js            # fetch wrapper, credentials: 'include'
        ├── auth.js           # useMe() hook
        ├── pages/
        │   ├── Landing.jsx
        │   ├── JoinRoom.jsx
        │   ├── BuildCard.jsx
        │   ├── MyCard.jsx
        │   ├── Leaderboard.jsx
        │   ├── AdminLogin.jsx
        │   ├── AdminDashboard.jsx
        │   └── AdminRoom.jsx
        └── components/
            ├── ItemPicker.jsx
            ├── PointsBar.jsx
            └── LeaderboardTable.jsx
```

## Data model

```js
// User
{ _id, username: String, isAdmin: Boolean, roomId: ObjectId|null, createdAt }
// Indexes:
//   { roomId: 1, username: 1 } unique  (player uniqueness within a room)
//   { username: 1, isAdmin: 1 } unique partial { isAdmin: true }  (admin username unique)

// Room
{ _id, code: String, name: String, createdBy: ObjectId, status: 'open'|'live'|'closed', createdAt }
// Index: { code: 1 } unique. code = 6-char uppercase alphanumeric, no 0/O/1/I.

// CatalogItem
{ _id, roomId: ObjectId, label: String, points: Number, happened: Boolean, occurredAt: Date|null }
// Index: { roomId: 1 }

// Card
{ _id, userId: ObjectId, roomId: ObjectId, itemIds: [ObjectId], totalPoints: Number, lockedAt: Date }
// Index: { userId: 1 } unique
```

## API

```
# Auth
POST /api/auth/admin-signup     { username, bootstrapToken }     → cookie, { user }
POST /api/auth/join-room        { username, roomCode }           → cookie, { user, room }
GET  /api/auth/me                                                → { user, room? }
POST /api/auth/logout                                            → 204

# Rooms (admin)
POST /api/rooms                 { name }                         → { room }
GET  /api/rooms                                                  → [rooms]
GET  /api/rooms/:id                                              → { room }

# Catalog
GET  /api/catalog                                                → [items]   (player, scoped to session room)
POST /api/rooms/:id/catalog     { label, points }                → item      (admin)
PATCH /api/rooms/:id/catalog/:itemId  { label?, points?, happened? }         (admin)
DELETE /api/rooms/:id/catalog/:itemId                                        (admin)

# Cards (player)
POST /api/cards                 { itemIds: [] }                  → { card }  (validates sum=24)
GET  /api/cards/me                                               → { card }
POST /api/cards/autofill        { itemIds: [] }                  → { itemIds }  (completion to 24)

# Leaderboard
GET  /api/rooms/:id/leaderboard                                  → [{ username, score, itemsHit, totalItems }]
```

## Key flows

**Player joins & builds card**
1. Landing → JoinRoom: enter username + 6-char room code.
2. Server finds Room by code; finds-or-creates User `{ username, roomId }`. Sets cookie.
3. BuildCard: catalog list (label + points chip), checkbox toggles, PointsBar shows `X / 24`.
4. "Auto-fill to 24": server returns a subset-sum completion. UI applies it.
5. Submit enabled only when sum = 24. Posts to `/api/cards`. Card locked (one per user).

**Admin runs the event**
1. AdminLogin: username + `ADMIN_BOOTSTRAP_TOKEN`.
2. AdminDashboard: list rooms, create room (auto-generates code).
3. AdminRoom: catalog CRUD pre-event; during event, one click toggles `happened` per item. Embedded leaderboard polls every 3s.

**Live ranking**
- Score per user = `Σ points` of card items with `happened=true`.
- Computed via Mongo aggregation: cards `$lookup` items → filter happened → `$sum` points.
- Client polls `/api/rooms/:id/leaderboard` every 3s with TanStack Query.

## Auto-fill algorithm (`server/src/utils/autofill.js`)

Given selected `itemIds` with sum `s ≤ 24`, find a subset of remaining items summing to `24 − s`. Subset-sum DP (target ≤ 24, items ≤ ~50). Shuffle inputs to avoid always returning the same fill. Returns `null` if no exact subset exists (UI shows "no exact fill — adjust selection").

## Validation (server-side)

- Card submit: `itemIds` non-empty, no duplicates, all belong to user's room, `sum(points) === 24`.
- One card per user (unique index). Re-submit → 409.
- Catalog edits blocked after the room's first card submission. `happened` toggles still allowed.
- `roomCode` normalized to uppercase, 6 alphanumeric chars (no 0/O/1/I).
- Bootstrap token check is constant-time compare.

## Verification (end-to-end)

Run `npm run dev` (root) → server on :4000, Vite on :5173. Then:

1. **Admin bootstrap**: `/admin/login` with username `admin` + `ADMIN_BOOTSTRAP_TOKEN` → AdminDashboard.
2. **Create room** "WWDC 2026" → code generated (e.g. `K7QF2P`).
3. **Add catalog**: 8–10 predictions with mixed point values that admit a valid 24-pt subset.
4. **Player flow** (incognito): JoinRoom as `alice` → manually pick to 24 → submit.
5. **Auto-fill flow**: as `bob`, pick a couple items → "Auto-fill to 24" → submit.
6. **Live ranking**: admin toggles `happened` on items; leaderboard tab updates within 3s.
7. **Edge cases**:
   - sum ≠ 24 → 400
   - second card per user → 409
   - bad room code → 404
   - bad bootstrap token → 401
   - catalog edit after first card → 409
   - auto-fill with no exact subset → friendly UI error

## Out of scope (v1)

- Passwords, email, OAuth, recovery
- Websockets / SSE
- Editing a locked card
- Per-room admin scoping
- Unit tests (manual e2e only)
- Mobile polish beyond responsive basics
