import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Explicitly load .env file with override to ensure we get the correct DATABASE_URL
// The shell environment might have a different DATABASE_URL (e.g., SQLite for local dev)
// We need to override it with the PostgreSQL URL from .env
const envPath = resolve(process.cwd(), '.env')
const envConfig = config({ path: envPath, override: true })

// Log if .env file was loaded successfully (only in development)
if (envConfig.error) {
  console.error('[db.ts] Warning: Could not load .env file:', envConfig.error.message)
}

// Get DATABASE_URL - now it should be from .env file due to override: true
const databaseUrl = process.env.DATABASE_URL

// Validate that we have a PostgreSQL URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in .env file or environment.')
}

if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.error('[db.ts] Invalid DATABASE_URL format. Expected PostgreSQL URL, got:', databaseUrl.substring(0, 50) + '...')
  throw new Error(
    'DATABASE_URL must be a PostgreSQL connection string (starting with postgresql:// or postgres://). ' +
    'Current value appears to be a SQLite path. Please check your .env file.'
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
