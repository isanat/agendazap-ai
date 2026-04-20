#!/bin/bash
# ============================================
# AgendaZap - Neon PostgreSQL Backup Script
# ============================================
# 
# Usage: ./backup-neon.sh [backup_type]
#   backup_type: daily (default), hourly, weekly, manual
#
# Environment variables:
#   NEON_API_KEY      - Neon API key
#   NEON_PROJECT_ID   - Neon project ID (auto-detected if not set)
#   DATABASE_URL      - PostgreSQL connection string
#   BACKUP_DIR        - Local backup directory (default: ./backups)
#   RETENTION_DAYS    - Days to keep backups (default: 30)

set -euo pipefail

# Configuration
BACKUP_TYPE="${1:-daily}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# Pre-flight checks
# ============================================

log_info "🚀 AgendaZap - Neon PostgreSQL Backup"
log_info "======================================"
log_info "Backup type: $BACKUP_TYPE"
log_info "Timestamp: $TIMESTAMP"

# Check required tools
for cmd in pg_dump gzip; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd is required but not installed"
        exit 1
    fi
done

# Check DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    log_error "DATABASE_URL environment variable is not set"
    exit 1
fi

log_info "✅ Pre-flight checks passed"

# ============================================
# Create backup directory
# ============================================

BACKUP_PATH="${BACKUP_DIR}/${DATE}"
mkdir -p "$BACKUP_PATH"

log_info "📁 Backup directory: $BACKUP_PATH"

# ============================================
# Method 1: Neon API Branch Backup (Preferred)
# ============================================

if [ -n "${NEON_API_KEY:-}" ]; then
    log_info "🔧 Using Neon API for branch-based backup..."
    
    # Extract project ID from DATABASE_URL if not set
    if [ -z "${NEON_PROJECT_ID:-}" ]; then
        # Try to extract from the hostname
        # Format: ep-crimson-brook-ampmy6z3.c-5.us-east-1.aws.neon.tech
        HOSTNAME=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^/]*\)\/.*/\1/p')
        # The endpoint ID contains the branch info, but we need the project ID
        log_warn "NEON_PROJECT_ID not set, will use pg_dump method"
    else
        # Create a branch as a backup point
        BRANCH_NAME="backup-${BACKUP_TYPE}-${TIMESTAMP}"
        
        log_info "Creating backup branch: $BRANCH_NAME"
        
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
            -H "Authorization: Bearer ${NEON_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{
                \"branch\": {
                    \"name\": \"${BRANCH_NAME}\",
                    \"parent_id\": \"main\"
                }
            }")
        
        if [ "$HTTP_CODE" -eq 201 ]; then
            log_info "✅ Backup branch created successfully"
        else
            log_warn "Failed to create backup branch (HTTP $HTTP_CODE), falling back to pg_dump"
        fi
    fi
else
    log_info "ℹ️  NEON_API_KEY not set, using pg_dump method"
fi

# ============================================
# Method 2: pg_dump Backup
# ============================================

log_info "💾 Running pg_dump backup..."

# Extract connection details from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname?params
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

# Sanitize for filename
SAFE_HOST=$(echo "$DB_HOST" | tr '.' '_')
BACKUP_FILE="${BACKUP_PATH}/agendazap_${SAFE_HOST}_${TIMESTAMP}.sql.gz"

log_info "Database: $DB_NAME @ $DB_HOST:$DB_PORT"

# Run pg_dump
# Use DIRECT_URL if available (non-pooled connection for pg_dump)
PG_URL="${DIRECT_URL:-$DATABASE_URL}"

PGPASSWORD=$(echo "$PG_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
pg_dump \
    --format=plain \
    --no-owner \
    --no-privileges \
    --compress=0 \
    "$PG_URL" 2>/dev/null | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "✅ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
    
    # Verify the backup is not empty
    if [ "$(zcat "$BACKUP_FILE" | wc -l)" -lt 10 ]; then
        log_error "Backup file seems too small - may be corrupted"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    log_error "Failed to create backup file"
    exit 1
fi

# ============================================
# Backup metadata
# ============================================

METADATA_FILE="${BACKUP_PATH}/backup_metadata.json"
cat > "$METADATA_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "${BACKUP_TYPE}",
  "database": "${DB_NAME}",
  "host": "${DB_HOST}",
  "file": "$(basename "$BACKUP_FILE")",
  "size_bytes": $(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0),
  "retention_days": ${RETENTION_DAYS}
}
EOF

log_info "📝 Metadata saved"

# ============================================
# Cleanup old backups
# ============================================

log_info "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."

find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "$BACKUP_DIR" -type f -name "backup_metadata.json" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Remove empty directories
find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true

log_info "✅ Cleanup complete"

# ============================================
# Summary
# ============================================

echo ""
log_info "📊 Backup Summary"
log_info "=================="
log_info "Type: $BACKUP_TYPE"
log_info "File: $BACKUP_FILE"
log_info "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
log_info "Retention: ${RETENTION_DAYS} days"
echo ""
log_info "✅ Backup completed successfully!"
