# ── Stage 1: Build client ──
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Build server ──
FROM node:20-slim AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx tsc

# ── Stage 3: Production ──
FROM node:20-slim AS production
WORKDIR /app

# Install production dependencies only (server)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server build output
COPY --from=server-build /app/server/dist ./server/dist

# Copy client build output
COPY --from=client-build /app/client/dist ./client/dist

# Create data directory for SQLite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/wedding-ledger.db

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
