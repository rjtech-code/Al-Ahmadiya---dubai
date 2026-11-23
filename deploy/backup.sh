#!/usr/bin/env bash
# Nightly backup of the database and uploaded files. Example cron (02:30 daily):
#   30 2 * * * cd /srv/ahmadiya && bash deploy/backup.sh >> /var/log/ahmadiya-backup.log 2>&1
# Copy the backup folder off the server (e.g. to UAE-region object storage) and test a restore before go-live.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=${BACKUP_DIR:-/var/backups/ahmadiya}
KEEP_DAYS=${KEEP_DAYS:-14}
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DEST"
DB_URL=$(grep -E '^DATABASE_URL=' apps/api/.env | cut -d= -f2- | tr -d '"')
STORAGE_DIR=$(grep -E '^STORAGE_DIR=' apps/api/.env | cut -d= -f2-)
pg_dump --format=custom --no-owner "$DB_URL" > "$DEST/db-$STAMP.dump"
tar -czf "$DEST/storage-$STAMP.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
find "$DEST" -type f -mtime +"$KEEP_DAYS" -delete
echo "Backup done: $DEST ($STAMP)"
