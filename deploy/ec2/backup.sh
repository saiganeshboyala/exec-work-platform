#!/usr/bin/env bash
# Nightly database dump, kept locally and optionally copied to S3.
#   sudo crontab -e
#   15 2 * * * /opt/cis/deploy/ec2/backup.sh >> /var/log/cis-backup.log 2>&1
set -euo pipefail

STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR=/var/backups/cis
S3_BUCKET="${S3_BUCKET:-}"          # export S3_BUCKET=s3://my-bucket/cis to enable
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/cis-$STAMP.sql.gz"

# shellcheck disable=SC1091
source "$STACK_DIR/.env"

docker compose -f "$STACK_DIR/docker-compose.prod.yml" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip > "$FILE"

# A zero-length dump is a failed dump; fail loudly rather than rotating it in.
[ -s "$FILE" ] || { echo "ERROR: empty dump at $FILE"; rm -f "$FILE"; exit 1; }

echo "$(date -Is) wrote $FILE ($(du -h "$FILE" | cut -f1))"

[ -n "$S3_BUCKET" ] && aws s3 cp "$FILE" "$S3_BUCKET/" --storage-class STANDARD_IA

find "$BACKUP_DIR" -name 'cis-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
