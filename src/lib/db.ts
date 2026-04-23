import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Try to load .env file for local development
// On Vercel/serverless, environment variables are injected by the platform
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const envPath = resolve(process.cwd(), '.env')
  const envConfig = config({ path: envPath, override: true })
  
  if (envConfig.error && process.env.NODE_ENV !== 'production') {
    console.error('[db.ts] Warning: Could not load .env file:', envConfig.error.message)
  }
}

// Get DATABASE_URL from environment (set by Vercel or .env file)
const databaseUrl = process.env.DATABASE_URL

// Validate that we have a PostgreSQL URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in .env file or Vercel environment variables.')
}

if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.error('[db.ts] Invalid DATABASE_URL format. Expected PostgreSQL URL, got:', databaseUrl.substring(0, 50) + '...')
  throw new Error(
    'DATABASE_URL must be a PostgreSQL connection string (starting with postgresql:// or postgres://). ' +
    'Current value appears to be a SQLite path. Please check your environment configuration.'
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always create a new PrismaClient to pick up schema changes
// In development, the global cache can become stale after prisma generate
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
  try {
    // Test if the cached client has the latest models
    if (!(globalForPrisma.prisma as any).lidMapping) {
      console.log('[db.ts] Cached PrismaClient missing models, creating fresh instance')
      globalForPrisma.prisma = undefined
    }
  } catch {
    globalForPrisma.prisma = undefined
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
