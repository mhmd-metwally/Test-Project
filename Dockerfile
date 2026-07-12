# ---- My Medical Assistant ----
FROM node:20-bookworm-slim

# Build tools are only needed if a prebuilt better-sqlite3 binary isn't
# available for this platform; they let npm compile it from source as a fallback.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

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
