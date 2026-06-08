#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

CYAN=$'\033[36m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[31m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

step()  { printf "${CYAN}▸ %s${RESET}\n" "$*"; }
ok()    { printf "${GREEN}✓ %s${RESET}\n" "$*"; }
warn()  { printf "${YELLOW}⚠ %s${RESET}\n" "$*"; }
fail()  { printf "${RED}✗ %s${RESET}\n" "$*"; }

# 1. Node check
step "Checking Node.js…"
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js not found. Install Node 18+ from https://nodejs.org or 'brew install node'."
  exit 1
fi
NODE_MAJOR=$(node -v | sed 's/^v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node $NODE_MAJOR detected. Need Node 18 or newer."
  exit 1
fi
ok "Node $(node -v)"

# 2. MongoDB check / autostart
step "Checking MongoDB on 127.0.0.1:27017…"
mongo_up() {
  (echo > /dev/tcp/127.0.0.1/27017) >/dev/null 2>&1
}
if mongo_up; then
  ok "MongoDB is reachable."
else
  warn "MongoDB not running. Trying to start it…"
  STARTED=0
  if command -v brew >/dev/null 2>&1 && brew list --formula 2>/dev/null | grep -q '^mongodb-community$'; then
    brew services start mongodb-community >/dev/null 2>&1 || true
    STARTED=1
  elif command -v mongod >/dev/null 2>&1; then
    mkdir -p ./.mongo-data
    nohup mongod --dbpath ./.mongo-data --bind_ip 127.0.0.1 --port 27017 --quiet \
      > ./.mongo-data/mongod.log 2>&1 &
    STARTED=1
  fi
  if [ "$STARTED" -eq 1 ]; then
    for i in 1 2 3 4 5 6 7 8 9 10; do
      sleep 1
      if mongo_up; then break; fi
    done
  fi
  if mongo_up; then
    ok "MongoDB started."
  else
    fail "Couldn't reach MongoDB."
    echo "   Install with: ${BOLD}brew tap mongodb/brew && brew install mongodb-community${RESET}"
    echo "   Or set MONGODB_URI in server/.env to an Atlas connection string and rerun."
    exit 1
  fi
fi

# 3. Install deps (only if missing)
if [ ! -d node_modules ] || [ ! -d server/node_modules ] || [ ! -d client/node_modules ]; then
  step "Installing dependencies (first run only — takes a minute)…"
  npm run install:all >/dev/null
  ok "Dependencies installed."
else
  ok "Dependencies already installed."
fi

# 4. Create server/.env with random secrets if missing
if [ ! -f server/.env ]; then
  step "Generating server/.env with random secrets…"
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  ADMIN_TOKEN=$(node -e "const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let o='';const b=require('crypto').randomBytes(12);for(const x of b)o+=c[x%c.length];console.log(o)")
  cat > server/.env <<EOF
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/wwdc-bingo
SESSION_SECRET=${SESSION_SECRET}
ADMIN_BOOTSTRAP_TOKEN=${ADMIN_TOKEN}
CLIENT_ORIGIN=http://localhost:5173
EOF
  ok "Wrote server/.env"
fi

# 5. Read the admin token to display
ADMIN_TOKEN=$(grep '^ADMIN_BOOTSTRAP_TOKEN=' server/.env | cut -d= -f2-)

# 6. Banner
printf "\n"
printf "${BOLD}╔══════════════════════════════════════════════════════════════════╗${RESET}\n"
printf "${BOLD}║${RESET}  🎟️  ${BOLD}Keynote Bingo${RESET} — starting up                              ${BOLD}║${RESET}\n"
printf "${BOLD}╠══════════════════════════════════════════════════════════════════╣${RESET}\n"
printf "${BOLD}║${RESET}  App:           ${CYAN}http://localhost:5173${RESET}                            ${BOLD}║${RESET}\n"
printf "${BOLD}║${RESET}  Admin login:   ${CYAN}http://localhost:5173/admin/login${RESET}                ${BOLD}║${RESET}\n"
printf "${BOLD}║${RESET}  Admin token:   ${GREEN}%-48s${RESET} ${BOLD}║${RESET}\n" "$ADMIN_TOKEN"
printf "${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}\n"
printf "\n${YELLOW}Tip:${RESET} sign in at ${BOLD}/admin/login${RESET} with any username + the token above.\n"
printf "Press Ctrl+C to stop.\n\n"

# 7. Run dev (server + client)
exec npm run dev
