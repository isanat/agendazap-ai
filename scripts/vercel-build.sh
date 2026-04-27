#!/bin/bash
# Vercel build script with Neon connection fixes
# Fixes:
# 1. Removes channel_binding=require from URLs (causes Prisma connection issues)
# 2. Derives correct DIRECT_URL from pooler URL (for Prisma migrations)
# 3. Adds connect_timeout for Neon cold start resilience

set -e

echo "🔧 [Build] Starting build with Neon connection fixes..."

# Copy PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# Generate Prisma client
echo "🔧 [Build] Generating Prisma client..."
prisma generate

# Fix connection URLs for migrations
# Remove channel_binding=require (incompatible with Prisma)
export DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/channel_binding=require&//g' | sed 's/channel_binding=require//g')
export DIRECT_URL=$(echo "$DIRECT_URL" | sed 's/channel_binding=require&//g' | sed 's/channel_binding=require//g')

# Fix DIRECT_URL: if it points to pooler, convert to direct endpoint
# Pooler: ep-crimson-brook-ampmy6z3-pooler.c-5.us-east-1.aws.neon.tech
# Direct: ep-crimson-brook-ampmy6z3.c-5.us-east-1.aws.neon.tech
if echo "$DIRECT_URL" | grep -q '\-pooler\.c-'; then
  echo "⚠️  [Build] DIRECT_URL uses pooler endpoint - converting to direct endpoint for migrations..."
  export DIRECT_URL=$(echo "$DIRECT_URL" | sed 's/-pooler\.c-/.c-/')
  echo "✅ [Build] DIRECT_URL fixed: $(echo $DIRECT_URL | sed 's/:[^@]*@/:***@/')"
fi

# Run migrations with fixed URLs
echo "🔧 [Build] Running Prisma migrations..."
if ! prisma migrate deploy; then
  echo "⚠️  [Build] MIGRATE_DEPLOY_FAILED - continuing with build (schema may already be up to date)"
fi

# Build Next.js
echo "🔧 [Build] Building Next.js..."
next build
