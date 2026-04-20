/**
 * Monitoring and Logging Module
 * 
 * Features:
 * - Structured logging with severity levels
 * - Health check for all critical services
 * - Error tracking with context
 * - Performance metrics
 */

// === LOG LEVELS ===
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  fatal: '\x1b[35m', // magenta
};

const LOG_EMOJI: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  fatal: '💀',
};

// === STRUCTURED LOGGER ===

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
  stack?: string;
  service: string;
}

class Logger {
  private service: string;
  private minLevel: LogLevel;

  constructor(service: string, minLevel: LogLevel = process.env.LOG_LEVEL as LogLevel || 'info') {
    this.service = service;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLog(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      // Production: JSON structured logs
      return JSON.stringify(entry);
    }
    // Development: Colored pretty logs
    const color = LOG_COLORS[entry.level];
    const reset = '\x1b[0m';
    const emoji = LOG_EMOJI[entry.level];
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error ? ` | Error: ${entry.error}` : '';
    return `${color}[${entry.level.toUpperCase()}]${reset} ${emoji} [${entry.service}] ${entry.message}${contextStr}${errorStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: this.service,
      ...(error ? { error: error.message, stack: error.stack } : {}),
    };

    const formatted = this.formatLog(entry);
    
    switch (level) {
      case 'fatal':
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    this.log('error', message, context, error instanceof Error ? error : undefined);
  }

  fatal(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    this.log('fatal', message, context, error instanceof Error ? error : undefined);
  }
}

// Create loggers for different services
export const logger = {
  auth: new Logger('auth'),
  ai: new Logger('ai'),
  whatsapp: new Logger('whatsapp'),
  api: new Logger('api'),
  db: new Logger('db'),
  system: new Logger('system'),
  webhook: new Logger('webhook'),
};

// === HEALTH CHECK ===

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    evolutionApi: ServiceHealth;
    ai: ServiceHealth;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
  lastChecked: string;
}

/**
 * Run comprehensive health check
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  // Check database
  const dbHealth = await checkDatabaseHealth();
  
  // Check Evolution API
  const evolutionHealth = await checkEvolutionApiHealth();
  
  // Check AI
  const aiHealth = await checkAiHealth();

  // Determine overall status
  const services = { database: dbHealth, evolutionApi: evolutionHealth, ai: aiHealth };
  const allUp = Object.values(services).every(s => s.status === 'up');
  const anyDown = Object.values(services).some(s => s.status === 'down');
  
  const overallStatus: HealthCheckResult['status'] = anyDown ? 'unhealthy' : allUp ? 'healthy' : 'degraded';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '2.0.0',
    services,
    metrics: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  };
}

async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
    return {
      status: 'up',
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkEvolutionApiHealth(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const { db } = await import('@/lib/db');
    const config = await db.systemConfiguration.findFirst();
    
    const apiUrl = process.env.EVOLUTION_API_URL || config?.evolutionApiUrl;
    const apiKey = process.env.EVOLUTION_API_KEY || config?.evolutionApiKey;

    if (!apiUrl || !apiKey) {
      return {
        status: 'degraded',
        latency: Date.now() - start,
        message: 'Evolution API not configured',
        lastChecked: new Date().toISOString(),
      };
    }

    const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: { 'apikey': apiKey },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return {
      status: response.ok ? 'up' : 'degraded',
      latency: Date.now() - start,
      message: response.ok ? undefined : `API returned ${response.status}`,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Evolution API unreachable',
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkAiHealth(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const { db } = await import('@/lib/db');
    const activeProviders = await db.aIProvider.count({
      where: { isEnabled: true }
    });

    return {
      status: activeProviders > 0 ? 'up' : 'degraded',
      latency: Date.now() - start,
      message: activeProviders > 0 ? `${activeProviders} AI providers active` : 'No AI providers configured',
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'AI health check failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

// === ERROR TRACKING ===

interface TrackedError {
  timestamp: string;
  error: string;
  stack?: string;
  context?: Record<string, unknown>;
  service: string;
}

// In-memory error store (last 100 errors)
const errorStore: TrackedError[] = [];
const MAX_ERRORS = 100;

/**
 * Track an error with context
 */
export function trackError(service: string, error: Error | unknown, context?: Record<string, unknown>): void {
  const tracked: TrackedError = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    service,
  };

  errorStore.push(tracked);
  if (errorStore.length > MAX_ERRORS) {
    errorStore.shift();
  }

  // Log the error
  const log = logger[service as keyof typeof logger] || logger.system;
  log.error(`Error tracked: ${tracked.error}`, error, context);
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit: number = 20): TrackedError[] {
  return errorStore.slice(-limit);
}

/**
 * Get error count by service
 */
export function getErrorCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const err of errorStore) {
    counts[err.service] = (counts[err.service] || 0) + 1;
  }
  return counts;
}
