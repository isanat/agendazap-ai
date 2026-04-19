#!/bin/bash
# ============================================
# AgendaZap - Database Migration Script for Neon
# ============================================

echo "🚀 AgendaZap - Neon PostgreSQL Migration"
echo "=========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set the following environment variables:"
    echo "  DATABASE_URL=\"postgresql://...pooler...\"  (for connection pooling)"
    echo "  DIRECT_URL=\"postgresql://...direct...\"    (for migrations)"
    exit 1
fi

# Check if DIRECT_URL is set
if [ -z "$DIRECT_URL" ]; then
    echo "⚠️  WARNING: DIRECT_URL is not set. Using DATABASE_URL for migrations."
    echo "   This may cause issues with connection pooling."
fi

echo ""
echo "📋 Step 1: Copying PostgreSQL schema..."
cp prisma/schema.postgresql.prisma prisma/schema.prisma

echo ""
echo "📋 Step 2: Generating Prisma Client..."
bunx prisma generate

echo ""
echo "📋 Step 3: Pushing schema to Neon database..."
bunx prisma db push --accept-data-loss

echo ""
echo "✅ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Configure OAuth credentials in Vercel:"
echo "      - GOOGLE_CLIENT_ID"
echo "      - GOOGLE_CLIENT_SECRET"
echo "      - MP_CLIENT_ID"
echo "      - MP_CLIENT_SECRET"
echo ""
echo "   2. Configure Evolution API in Admin Settings"
echo ""
echo "   3. Test the integration flows"
