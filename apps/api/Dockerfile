# ═══════════════════════════════════════════════════════════════════════════════
# NEXUS API SERVER DOCKERFILE
# Multi-stage build for minimal production image
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# Base stage: Common setup for all stages
# ─────────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

# ─────────────────────────────────────────────────────────────────────────────────
# Dependencies stage: Install all dependencies
# ─────────────────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────────
# Builder stage: Build the application
# ─────────────────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

COPY . .

# Generate Prisma client
RUN pnpm --filter database generate

# Build packages and app
RUN pnpm --filter @nexus/shared-types build
RUN pnpm --filter @nexus/api build

# ─────────────────────────────────────────────────────────────────────────────────
# Development stage: For local development with hot reload
# ─────────────────────────────────────────────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

COPY . .

# Generate Prisma client
RUN pnpm --filter database generate

EXPOSE 4000

CMD ["pnpm", "--filter", "@nexus/api", "dev"]

# ─────────────────────────────────────────────────────────────────────────────────
# Production stage: Minimal image for production
# ─────────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nexus

WORKDIR /app

# Copy only necessary files
COPY --from=builder --chown=nexus:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nexus:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=nexus:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=nexus:nodejs /app/packages/database/package.json ./packages/database/
COPY --from=builder --chown=nexus:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=nexus:nodejs /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder --chown=nexus:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nexus:nodejs /app/packages/database/node_modules/.prisma ./packages/database/node_modules/.prisma

USER nexus

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider [localhost](http://localhost:4000/health) || exit 1

CMD ["node", "apps/api/dist/index.js"]
