#!/bin/bash
# BidIQ Database Backup Script
# Backs up Supabase PostgreSQL database to local storage

set -e  # Exit on any error

# Configuration
BACKUP_DIR="./backups/database"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="bidiq_backup_${TIMESTAMP}.sql"
KEEP_DAYS=7  # Keep backups for 7 days

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starting BidIQ database backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Extract database credentials from Supabase URL
# Format: https://PROJECT_REF.supabase.co
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/.supabase.co//')

# Get database password from Supabase dashboard or use service key
# You'll need to add DB_PASSWORD to your .env file
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  DB_PASSWORD not set in .env${NC}"
    echo -e "${YELLOW}   Get it from: Supabase Dashboard → Project Settings → Database → Connection String${NC}"
    echo -e "${YELLOW}   Add to .env: DB_PASSWORD=your_password_here${NC}"
    exit 1
fi

# Supabase connection details
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo -e "${GREEN}📊 Database: ${DB_HOST}${NC}"
echo -e "${GREEN}💾 Backup file: ${BACKUP_FILE}${NC}"

# Create backup using pg_dump
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -b \
    -v \
    -f "${BACKUP_DIR}/${BACKUP_FILE}" \
    2>&1 | grep -v "NOTICE"

# Check if backup was successful
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo -e "${GREEN}   File: ${BACKUP_DIR}/${BACKUP_FILE}${NC}"
    echo -e "${GREEN}   Size: ${SIZE}${NC}"

    # Create a "latest" symlink for easy access
    ln -sf "$BACKUP_FILE" "${BACKUP_DIR}/latest.sql"

    # Compress backup to save space
    echo -e "${GREEN}🗜️  Compressing backup...${NC}"
    gzip -f "${BACKUP_DIR}/${BACKUP_FILE}"
    echo -e "${GREEN}✅ Compressed to ${BACKUP_FILE}.gz${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# Clean up old backups (keep last KEEP_DAYS days)
echo -e "${GREEN}🧹 Cleaning up old backups (keeping last ${KEEP_DAYS} days)...${NC}"
find "$BACKUP_DIR" -name "bidiq_backup_*.sql.gz" -type f -mtime +$KEEP_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "bidiq_backup_*.sql.gz" -type f | wc -l)
echo -e "${GREEN}📦 ${REMAINING} backup(s) remaining${NC}"

# Optional: Upload to cloud storage (uncomment and configure)
# echo -e "${GREEN}☁️  Uploading to cloud storage...${NC}"
# rclone copy "${BACKUP_DIR}/${BACKUP_FILE}.gz" "googledrive:BidIQ-Backups/"

echo -e "${GREEN}✅ Backup process complete!${NC}"
echo ""
echo -e "${YELLOW}📝 To restore from backup:${NC}"
echo -e "${YELLOW}   1. Decompress: gunzip ${BACKUP_DIR}/${BACKUP_FILE}.gz${NC}"
echo -e "${YELLOW}   2. Restore: pg_restore -h HOST -U postgres -d postgres -c ${BACKUP_DIR}/${BACKUP_FILE}${NC}"
