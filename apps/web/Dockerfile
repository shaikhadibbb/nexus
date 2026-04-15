FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY . .
RUN pnpm --filter @nexus/shared-types build
RUN pnpm --filter @nexus/web build

FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@nexus/web", "dev"]

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nexus

COPY --from=builder --chown=nexus:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nexus:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nexus:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=nexus:nodejs /app/node_modules ./node_modules

USER nexus
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["sh", "-c", "cd apps/web && node ../../node_modules/next/dist/bin/next start -p 3000"]
