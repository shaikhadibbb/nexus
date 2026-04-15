# Nexus Setup

## Prerequisites
- Node.js 20+
- pnpm 8+
- Docker + Docker Compose

## Environment
1. Copy `.env.example` to `.env`.
2. Replace all `REPLACE_WITH_*` placeholders with real secrets.
3. Generate JWT secrets with:
   - `openssl rand -base64 48`

## Start Infrastructure
- Run: `pnpm docker:dev`
- Services started: Postgres, Redis, MinIO, API, Web.

## Database
- Create migrations in development with `pnpm db:migrate`.
- Deploy migrations in CI/production with `pnpm db:deploy`.
- `db:push` is intentionally blocked to prevent destructive production usage.

## Media Storage
- Uploads use pre-signed URLs from the API.
- Buckets are private by default; do not enable anonymous access.

## Local Verification
- API health: `http://localhost:4000/health`
- Web app: `http://localhost:3000`
- Nginx health (production profile): `http://localhost/health`

## Production Secrets
- Use a real secrets manager (AWS Secrets Manager, Doppler, Vault, etc.).
- Do not store production secrets in committed files.
