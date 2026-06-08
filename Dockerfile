FROM node:20-slim

WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all workspaces incl. devDeps (vite needed for the client build)
RUN npm install --include=dev \
 && npm --prefix server install --include=dev \
 && npm --prefix client install --include=dev

COPY . .

# Build the client bundle into client/dist
RUN npm run build

ENV NODE_ENV=production
# PORT is injected by Railway at runtime; server reads process.env.PORT
CMD ["npm", "start"]
