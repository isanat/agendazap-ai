import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Try to load .env file for local development
// On Vercel/serverless, environment variables are injected by the platform
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const envPath = resolve(process.cwd(), '.env')
  const envConfig = config({ path: envPath, override: true })

  if (envConfig.error && process.env.NODE_ENV !== 'production') {
    // No .env file is fine - env vars may be set by the platform
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _dbInitError: string | null
  _dbWarmingUp: boolean
}

// Check if we have a valid database URL
function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    const msg = 'DATABASE_URL environment variable is required. Please set it in .env file or Vercel environment variables.'
    console.error('[db.ts] ERROR:', msg)
    globalForPrisma._dbInitError = msg
    throw new Error(msg)
  }

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    const msg = `DATABASE_URL must be a PostgreSQL connection string (starting with postgresql:// or postgres://). Got: ${databaseUrl.substring(0, 30)}...`
    console.error('[db.ts] ERROR:', msg)
    globalForPrisma._dbInitError = msg
    throw new Error(msg)
  }

  globalForPrisma._dbInitError = null
  return databaseUrl
}

// Create PrismaClient with lazy initialization
function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl()

  // In development, check if cached client has the latest models
  if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
    try {
      if (!(globalForPrisma.prisma as any).lidMapping) {
        console.log('[db.ts] Cached PrismaClient missing models, creating fresh instance')
        globalForPrisma.prisma = undefined
      }
    } catch {
      globalForPrisma.prisma = undefined
    }
  }

  const client =
    globalForPrisma.prisma ??
    new PrismaClient({
      datasourceUrl: databaseUrl,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client

  return client
}

// Lazy initialization with Proxy to avoid module-level crashes
let _db: PrismaClient | null = null

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!_db) {
      try {
        _db = createPrismaClient()
      } catch (error) {
        console.error('[db.ts] Failed to initialize PrismaClient:', error instanceof Error ? error.message : error)
        throw error
      }
    }
    return Reflect.get(_db, prop, receiver)
  },
})

/**
 * Warm up the Neon database connection.
 * Neon databases pause after inactivity and need a "wake up" query.
 * This function retries the connection with exponential backoff.
 */
export async function warmUpDatabase(maxRetries = 3): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  if (globalForPrisma._dbWarmingUp) {
    return { ok: true, latencyMs: 0 }
  }

  globalForPrisma._dbWarmingUp = true

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!_db) {
          _db = createPrismaClient()
        }

        const start = Date.now()
        await _db.$queryRaw`SELECT 1`
        const latencyMs = Date.now() - start

        console.log(`[db.ts] Database warm-up successful (attempt ${attempt}, ${latencyMs}ms)`)
        return { ok: true, latencyMs }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.warn(`[db.ts] Database warm-up attempt ${attempt}/${maxRetries} failed:`, errorMsg)

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s...
          const delayMs = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delayMs))

          // Reset the client for retry
          try {
            await _db?.$disconnect()
          } catch { /* ignore */ }
          _db = null
          globalForPrisma.prisma = undefined
        } else {
          return { ok: false, error: errorMsg }
        }
      }
    }

    return { ok: false, error: 'Max retries exceeded' }
  } finally {
    globalForPrisma._dbWarmingUp = false
  }
}

/**
 * Check if the database is properly configured and accessible.
 * Returns { ok: boolean, error?: string } with diagnostic info.
 * Also attempts to warm up Neon if the connection is cold.
 */
export async function checkDatabaseHealth(): Promise<{ ok: boolean; error?: string; latencyMs?: number; details?: string }> {
  try {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      return { ok: false, error: 'DATABASE_URL environment variable is not set' }
    }

    if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
      return { ok: false, error: `DATABASE_URL is not a PostgreSQL URL (starts with: ${databaseUrl.substring(0, 15)})` }
    }

    // Try the health check with Neon warm-up
    const warmUpResult = await warmUpDatabase(2)

    if (warmUpResult.ok) {
      return { ok: true, latencyMs: warmUpResult.latencyMs }
    }

    return { ok: false, error: warmUpResult.error }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

/**
 * Verify that the database schema has all required tables/columns.
 * Specifically checks for the timezone field on Account.
 */
export async function verifyDatabaseSchema(): Promise<{
  ok: boolean;
  missingColumns?: string[];
  timezoneFieldExists?: boolean;
  error?: string;
}> {
  try {
    if (!_db) {
      _db = createPrismaClient()
    }

    // Check if the Account table has the timezone column
    const result = await _db.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Account'
      AND column_name = 'timezone'
    `

    const timezoneFieldExists = result.length > 0

    const missingColumns: string[] = []
    if (!timezoneFieldExists) {
      missingColumns.push('Account.timezone')
    }

    return {
      ok: missingColumns.length === 0,
      missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
      timezoneFieldExists,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Schema verification failed',
    }
  }
}

/**
 * Check if an error is a database connection error that can be retried.
 * Neon databases pause after inactivity, causing P1001/P1002 errors on cold starts.
 */
function isDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const prismaError = error as { code?: string; message?: string }
  // P1001 = Can't reach database server
  // P1002 = Connection timed out
  // P1003 = Database does not exist
  // P1008 = Connection refused
  // P1009 = Database already exists
  // P1010 = Cloud provider rejected the request
  // P1011 = Error opening a TLS connection
  // P1017 = Server has closed the connection
  // P2024 = Timed out fetching a connection from the connection pool
  const retryableCodes = ['P1001', 'P1002', 'P1008', 'P1011', 'P1017', 'P2024']
  if (prismaError.code && retryableCodes.includes(prismaError.code)) return true
  // Also check message for "Can't reach database server" or similar
  if (prismaError.message && (
    prismaError.message.includes("Can't reach database server") ||
    prismaError.message.includes("Connection timed out") ||
    prismaError.message.includes("connection pool") ||
    prismaError.message.includes("ECONNREFUSED") ||
    prismaError.message.includes("ECONNRESET")
  )) return true
  return false
}

/**
 * Reset the PrismaClient connection to force a new connection on next query.
 * Useful when the existing connection is stale (e.g., Neon paused the database).
 */
export async function resetDbConnection(): Promise<void> {
  try {
    if (_db) {
      await _db.$disconnect().catch(() => {})
    }
  } catch { /* ignore */ }
  _db = null
  globalForPrisma.prisma = undefined
}

/**
 * Execute a database operation with automatic retry on connection errors.
 * Neon databases pause after inactivity and need retries on cold starts.
 * 
 * @param operation The database operation to execute
 * @param maxRetries Maximum number of retries (default: 3)
 * @param baseDelayMs Base delay in ms for exponential backoff (default: 1000)
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (!isDbConnectionError(error)) {
        // Not a connection error, don't retry
        throw error
      }
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.warn(`[db.ts] DB connection error (attempt ${attempt}/${maxRetries}): ${errorMsg}`)
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
        console.log(`[db.ts] Retrying in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        
        // Reset connection for retry
        await resetDbConnection()
      }
    }
  }
  
  throw lastError
}
