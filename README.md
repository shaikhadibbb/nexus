# Nexus

Momentum-driven social platform monorepo powered by Turborepo.

## Quickstart

### 1) Prerequisites

- Node.js 20+
- Corepack enabled (`corepack enable`)
- Docker + Docker Compose

### 2) Install dependencies

```bash
pnpm install
```

### 3) Start local infrastructure (Postgres, Redis, MinIO)

```bash
pnpm docker:dev
```

This boots:

- Postgres on `localhost:5432`
- Redis on `localhost:6379`
- MinIO API on `localhost:9000`
- MinIO Console on `localhost:9001`

`minio-init` automatically creates the `nexus-media` bucket and sets it to public.

### 4) Start app development servers

```bash
pnpm dev
```

Default URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

### 5) Stop infrastructure

```bash
pnpm docker:down
```

## Common commands

```bash
pnpm lint
pnpm type-check
pnpm build
```
