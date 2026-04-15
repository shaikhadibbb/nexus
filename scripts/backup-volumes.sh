#!/usr/bin/env sh
set -eu

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-./backups/$TIMESTAMP}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-nexus-postgres}"
MINIO_CONTAINER="${MINIO_CONTAINER:-nexus-minio}"
POSTGRES_USER="${POSTGRES_USER:-nexus}"
POSTGRES_DB="${POSTGRES_DB:-nexus_db}"
S3_BUCKET="${S3_BUCKET:-nexus-media}"

mkdir -p "$BACKUP_DIR"

echo "Creating Postgres backup..."
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_DIR/postgres.sql"

echo "Creating MinIO bucket backup..."
docker exec "$MINIO_CONTAINER" sh -c "mkdir -p /tmp/minio-backup && mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD >/dev/null && mc mirror local/$S3_BUCKET /tmp/minio-backup/$S3_BUCKET >/dev/null"
docker cp "$MINIO_CONTAINER:/tmp/minio-backup/$S3_BUCKET" "$BACKUP_DIR/minio-bucket"

echo "Backup completed at $BACKUP_DIR"
