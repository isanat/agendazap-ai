/**
 * Evolution API Health Check & Message Queue Service
 * 
 * Provides:
 * - Health check for Evolution API connectivity
 * - Auto-reconnect detection (when API comes back online)
 * - Pending message queue for retrying failed messages
 * - Periodic health monitoring
 * 
 * Fix #6: Evolution API cai → Health check + auto-reconnect + fila de mensagens pendentes
 */

import { db } from '@/lib/db';
import { getEvolutionApiConfig } from '@/lib/lid-resolution';

// === TYPES ===

interface HealthStatus {
  isHealthy: boolean;
  lastCheck: Date | null;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  consecutiveFailures: number;
  latencyMs: number | null;
  errorMessage: string | null;
}

interface PendingMessage {
  id: string;
  accountId: string;
  phone: string;
  message: string;
  messageType: string;
  appointmentId?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
  createdAt: Date;
  lastError?: string;
}

// === IN-MEMORY STATE ===

let healthStatus: HealthStatus = {
  isHealthy: true, // Assume healthy until proven otherwise
  lastCheck: null,
  lastSuccess: null,
  lastFailure: null,
  consecutiveFailures: 0,
  latencyMs: null,
  errorMessage: null,
};

const pendingQueue: PendingMessage[] = [];
const MAX_PENDING_MESSAGES = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [30_000, 120_000, 300_000]; // 30s, 2min, 5min

let healthCheckInterval: NodeJS.Timeout | null = null;
let queueProcessInterval: NodeJS.Timeout | null = null;

// === HEALTH CHECK ===

/**
 * Check if Evolution API is reachable and responsive
 */
export async function checkEvolutionApiHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const config = await getEvolutionApiConfig();
    if (!config) {
      healthStatus = {
        ...healthStatus,
        isHealthy: false,
        lastCheck: new Date(),
        consecutiveFailures: healthStatus.consecutiveFailures + 1,
        latencyMs: null,
        errorMessage: 'Evolution API not configured',
      };
      return healthStatus;
    }
    
    // Use the fetchInstances endpoint as a lightweight health check
    // This is a simple GET that returns instance status without heavy operations
    const response = await fetch(`${config.apiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': config.apiKey,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout for health check
    });
    
    const latencyMs = Date.now() - startTime;
    
    if (response.ok) {
      const wasDown = !healthStatus.isHealthy;
      
      healthStatus = {
        isHealthy: true,
        lastCheck: new Date(),
        lastSuccess: new Date(),
        lastFailure: healthStatus.lastFailure,
        consecutiveFailures: 0,
        latencyMs,
        errorMessage: null,
      };
      
      // If API was down and is now back, process pending queue
      if (wasDown) {
        console.log(`[Evolution Health] ✅ API is back online after being down! Processing pending queue (${pendingQueue.length} messages)`);
        processPendingQueue().catch(err => {
          console.error('[Evolution Health] Error processing pending queue on recovery:', err);
        });
      }
    } else {
      const errorText = await response.text().catch(() => 'unknown');
      healthStatus = {
        isHealthy: false,
        lastCheck: new Date(),
        lastSuccess: healthStatus.lastSuccess,
        lastFailure: new Date(),
        consecutiveFailures: healthStatus.consecutiveFailures + 1,
        latencyMs,
        errorMessage: `API returned ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    healthStatus = {
      isHealthy: false,
      lastCheck: new Date(),
      lastSuccess: healthStatus.lastSuccess,
      lastFailure: new Date(),
      consecutiveFailures: healthStatus.consecutiveFailures + 1,
      latencyMs,
      errorMessage: error?.message || 'Connection failed',
    };
  }
  
  if (!healthStatus.isHealthy) {
    console.warn(`[Evolution Health] ❌ API unhealthy (consecutive failures: ${healthStatus.consecutiveFailures}): ${healthStatus.errorMessage}`);
  }
  
  return healthStatus;
}

/**
 * Get current health status without performing a check
 */
export function getHealthStatus(): HealthStatus {
  return { ...healthStatus };
}

/**
 * Check if the API is healthy enough to send messages
 * If not recently checked, performs a check
 */
export async function isApiReady(): Promise<boolean> {
  // If we checked recently (within 30 seconds), use cached status
  if (healthStatus.lastCheck) {
    const timeSinceLastCheck = Date.now() - healthStatus.lastCheck.getTime();
    if (timeSinceLastCheck < 30_000) {
      return healthStatus.isHealthy;
    }
  }
  
  // Otherwise, perform a fresh check
  const status = await checkEvolutionApiHealth();
  return status.isHealthy;
}

// === MESSAGE QUEUE ===

/**
 * Add a failed message to the pending queue for later retry
 */
export function enqueuePendingMessage(msg: Omit<PendingMessage, 'id' | 'retryCount' | 'nextRetryAt' | 'createdAt'>): boolean {
  if (pendingQueue.length >= MAX_PENDING_MESSAGES) {
    console.warn(`[Evolution Queue] ⚠️ Pending queue is full (${MAX_PENDING_MESSAGES}), dropping oldest message`);
    pendingQueue.shift(); // Remove oldest
  }
  
  const pendingMsg: PendingMessage = {
    ...msg,
    id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    nextRetryAt: new Date(Date.now() + RETRY_DELAYS_MS[0]),
    createdAt: new Date(),
  };
  
  pendingQueue.push(pendingMsg);
  console.log(`[Evolution Queue] 📥 Message enqueued for retry: ${pendingMsg.id} (phone: ${msg.phone}, queue size: ${pendingQueue.length})`);
  
  return true;
}

/**
 * Process pending message queue - retry messages that are due
 */
export async function processPendingQueue(): Promise<{ processed: number; failed: number; remaining: number }> {
  if (pendingQueue.length === 0) {
    return { processed: 0, failed: 0, remaining: 0 };
  }
  
  // Check if API is healthy before processing
  const isHealthy = await isApiReady();
  if (!isHealthy) {
    console.log(`[Evolution Queue] ⏸️ API still unhealthy, skipping queue processing (${pendingQueue.length} messages pending)`);
    return { processed: 0, failed: 0, remaining: pendingQueue.length };
  }
  
  const now = new Date();
  let processed = 0;
  let failed = 0;
  
  // Process messages that are due for retry
  const toProcess = pendingQueue.filter(msg => msg.nextRetryAt <= now);
  
  for (const msg of toProcess) {
    try {
      // Import the send function dynamically to avoid circular dependencies
      const { sendWhatsAppMessage: sendMsg } = await import('@/app/api/webhooks/evolution/route');
      const result = await sendMsg(msg.accountId, msg.phone, msg.message);
      
      if (result.success) {
        // Message sent successfully - remove from queue
        const index = pendingQueue.findIndex(m => m.id === msg.id);
        if (index !== -1) pendingQueue.splice(index, 1);
        processed++;
        console.log(`[Evolution Queue] ✅ Pending message sent: ${msg.id} to ${msg.phone}`);
        
        // Update the WhatsApp message record in DB
        try {
          await db.whatsappMessage.updateMany({
            where: {
              accountId: msg.accountId,
              clientPhone: msg.phone,
              status: 'failed',
              message: msg.message.substring(0, 500),
            },
            data: { status: 'sent' },
            orderBy: { createdAt: 'desc' },
          });
        } catch (dbErr) {
          console.warn(`[Evolution Queue] Could not update message status in DB:`, dbErr);
        }
      } else {
        // Send failed - increment retry count
        msg.retryCount++;
        msg.lastError = result.error || 'Unknown error';
        
        if (msg.retryCount >= msg.maxRetries) {
          // Max retries reached - remove from queue
          const index = pendingQueue.findIndex(m => m.id === msg.id);
          if (index !== -1) pendingQueue.splice(index, 1);
          failed++;
          console.error(`[Evolution Queue] ❌ Max retries reached for message ${msg.id}: ${msg.lastError}`);
        } else {
          // Schedule next retry
          const delay = RETRY_DELAYS_MS[Math.min(msg.retryCount, RETRY_DELAYS_MS.length - 1)];
          msg.nextRetryAt = new Date(Date.now() + delay);
          console.log(`[Evolution Queue] 🔄 Retry ${msg.retryCount}/${msg.maxRetries} scheduled for ${msg.id} in ${delay / 1000}s`);
        }
      }
    } catch (error) {
      console.error(`[Evolution Queue] Error processing message ${msg.id}:`, error);
      msg.retryCount++;
      if (msg.retryCount >= msg.maxRetries) {
        const index = pendingQueue.findIndex(m => m.id === msg.id);
        if (index !== -1) pendingQueue.splice(index, 1);
        failed++;
      } else {
        const delay = RETRY_DELAYS_MS[Math.min(msg.retryCount, RETRY_DELAYS_MS.length - 1)];
        msg.nextRetryAt = new Date(Date.now() + delay);
      }
    }
  }
  
  return { processed, failed, remaining: pendingQueue.length };
}

/**
 * Get pending queue stats
 */
export function getQueueStats(): { size: number; oldestMessage: Date | null; nextRetryAt: Date | null } {
  const oldest = pendingQueue.length > 0 
    ? pendingQueue.reduce((oldest, msg) => msg.createdAt < oldest ? msg.createdAt : oldest, pendingQueue[0].createdAt)
    : null;
  
  const nextRetry = pendingQueue.length > 0
    ? pendingQueue.reduce((earliest, msg) => msg.nextRetryAt < earliest ? msg.nextRetryAt : earliest, pendingQueue[0].nextRetryAt)
    : null;
  
  return {
    size: pendingQueue.length,
    oldestMessage: oldest,
    nextRetryAt: nextRetry,
  };
}

// === PERIODIC MONITORING ===

/**
 * Start periodic health checks and queue processing
 */
export function startHealthMonitoring(): void {
  if (healthCheckInterval) {
    console.log('[Evolution Health] Monitoring already running');
    return;
  }
  
  // Health check every 60 seconds
  healthCheckInterval = setInterval(async () => {
    try {
      await checkEvolutionApiHealth();
    } catch (err) {
      console.error('[Evolution Health] Health check error:', err);
    }
  }, 60_000);
  
  // Queue processing every 30 seconds
  queueProcessInterval = setInterval(async () => {
    try {
      if (pendingQueue.length > 0) {
        const result = await processPendingQueue();
        if (result.processed > 0 || result.failed > 0) {
          console.log(`[Evolution Queue] Processed: ${result.processed}, Failed: ${result.failed}, Remaining: ${result.remaining}`);
        }
      }
    } catch (err) {
      console.error('[Evolution Queue] Queue processing error:', err);
    }
  }, 30_000);
  
  console.log('[Evolution Health] ✅ Health monitoring started (60s health check, 30s queue processing)');
  
  // Perform initial health check
  checkEvolutionApiHealth().catch(err => {
    console.error('[Evolution Health] Initial health check error:', err);
  });
}

/**
 * Stop periodic health checks and queue processing
 */
export function stopHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  if (queueProcessInterval) {
    clearInterval(queueProcessInterval);
    queueProcessInterval = null;
  }
  console.log('[Evolution Health] Health monitoring stopped');
}

// Auto-start health monitoring when this module is imported (server-side only)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Delay start to avoid interfering with Next.js initialization
  setTimeout(() => {
    startHealthMonitoring();
  }, 10_000); // Start after 10 seconds
}
