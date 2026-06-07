# syntax=docker/dockerfile:1

# ---------- Rust Builder ----------
FROM rust:1-slim AS rust-builder
WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libsqlite3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock* ./
RUN mkdir src \
    && echo "fn main() {}" > src/main.rs \
    && echo "pub fn dummy() {}" > src/lib.rs \
    && cargo build --release \
    && rm -rf src

COPY backend/src ./src
RUN touch src/lib.rs src/main.rs && cargo build --release

# ---------- Next.js Builder ----------
FROM oven/bun:1 AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="file:/app/data/prod.db"

COPY package.json bun.lock* bun.lockb* ./
RUN bun install

COPY . .
RUN bun run db:generate
RUN bun run build

# ---------- Prisma CLI installer ----------
# Separate stage so the runner gets Prisma's full dep tree without
# manually enumerating every transitive package. npm resolves the tree.
FROM node:22-slim AS prisma-installer
WORKDIR /prisma
COPY package.json ./
RUN npm install prisma @prisma/client --omit=dev --no-package-lock

# ---------- Runner ----------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL="file:/app/data/prod.db" \
    BACKEND_URL="http://localhost:8080"

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates wget curl libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# 1. Next.js standalone server + assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 2. Prisma CLI + full dep tree (from dedicated installer)
#    Copies into node_modules on top of the standalone's node_modules.
COPY --from=prisma-installer /prisma/node_modules ./node_modules

# 3. Overwrite with builder-generated Prisma client (correct engines for
#    target arch, produced by `prisma generate` during the bun build).
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 4. Prisma schema + migration files (needed by migrate deploy at runtime)
COPY --from=builder /app/prisma ./prisma

# 5. Rust backend binary
COPY --from=rust-builder /app/backend/target/release/lifeos-backend /usr/local/bin/lifeos-backend

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /usr/local/bin/lifeos-backend \
    && mkdir -p /app/data \
    && chown -R node:node /app /usr/local/bin/lifeos-backend

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:3000/ > /dev/null && \
        curl -sf http://localhost:8080/health > /dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
