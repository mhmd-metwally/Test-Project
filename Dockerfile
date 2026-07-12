# ---- My Medical Assistant ----
# Node 22+ ships a built-in SQLite, so there is no native module to compile
# and no build tools are needed.
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App source.
COPY server ./server
COPY public ./public

ENV NODE_ENV=production
# Store the database on a mounted volume so it survives restarts/redeploys.
ENV DATA_DIR=/data
VOLUME ["/data"]

# Hosting platforms inject PORT; default to 3000 for local runs.
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/server.js"]
