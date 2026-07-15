# AIVS worker — Node 26 + ffmpeg, runs the BullMQ consumer for all queues.
# Build from the REPO ROOT:  docker build -f apps/worker/Dockerfile .
FROM node:26-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Node 26 images ship without corepack — install pnpm directly.
RUN npm install -g pnpm@11.8.0

WORKDIR /app

# Workspace manifests first for layer caching.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/assets/package.json packages/assets/
COPY packages/auth/package.json packages/auth/
COPY packages/content/package.json packages/content/
COPY packages/database/package.json packages/database/
COPY packages/generation/package.json packages/generation/
COPY packages/media-core/package.json packages/media-core/
COPY packages/providers/package.json packages/providers/
COPY packages/queue/package.json packages/queue/
COPY packages/storage/package.json packages/storage/
COPY packages/types/package.json packages/types/

# Sources (Node 26 runs TS directly — no build step).
COPY apps/worker apps/worker
COPY packages packages

# Install only what the worker graph needs; postinstall generates the
# Prisma client (no DATABASE_URL required at build time).
RUN pnpm install --frozen-lockfile --filter @aivs/worker...

ENV NODE_ENV=production
CMD ["node", "apps/worker/src/index.ts"]
