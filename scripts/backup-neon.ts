/**
 * Neon PostgreSQL Backup Script (TypeScript)
 * 
 * Can be run as: bun run scripts/backup-neon.ts
 * 
 * Features:
 * - pg_dump backup via Neon API
 * - Branch-based backup (instant, no data transfer)
 * - Automatic cleanup of old backups
 * - Metadata tracking
 */

const NEON_API_BASE = 'https://console.neon.tech/api/v2';

interface BackupConfig {
  neonApiKey: string;
  neonProjectId: string;
  databaseUrl: string;
  directUrl: string;
  backupType: 'daily' | 'hourly' | 'weekly' | 'manual';
  retentionDays: number;
}

interface BackupResult {
  success: boolean;
  branchId?: string;
  branchName?: string;
  pgDumpFile?: string;
  error?: string;
  timestamp: string;
}

/**
 * Create a branch backup using Neon API (instant, no data transfer)
 */
async function createBranchBackup(config: BackupConfig): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const branchName = `backup-${config.backupType}-${timestamp}`;

  try {
    const response = await fetch(
      `${NEON_API_BASE}/projects/${config.neonProjectId}/branches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.neonApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: {
            name: branchName,
            parent_id: 'main',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Neon API error: ${response.status} - ${error}`,
        timestamp: new Date().toISOString(),
      };
    }

    const data = await response.json();
    return {
      success: true,
      branchId: data.branch?.id,
      branchName,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * List backup branches
 */
async function listBackupBranches(config: BackupConfig): Promise<any[]> {
  try {
    const response = await fetch(
      `${NEON_API_BASE}/projects/${config.neonProjectId}/branches`,
      {
        headers: {
          'Authorization': `Bearer ${config.neonApiKey}`,
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.branches || []).filter((b: any) => b.name?.startsWith('backup-'));
  } catch {
    return [];
  }
}

/**
 * Delete old backup branches
 */
async function cleanupOldBranches(config: BackupConfig): Promise<number> {
  const branches = await listBackupBranches(config);
  const cutoffDate = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000);
  
  let deleted = 0;
  for (const branch of branches) {
    const createdAt = new Date(branch.created_at);
    if (createdAt < cutoffDate) {
      try {
        const response = await fetch(
          `${NEON_API_BASE}/projects/${config.neonProjectId}/branches/${branch.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${config.neonApiKey}`,
            },
          }
        );
        if (response.ok) {
          deleted++;
          console.log(`[Cleanup] Deleted old backup branch: ${branch.name}`);
        }
      } catch {
        // Ignore deletion errors
      }
    }
  }

  return deleted;
}

/**
 * Main backup function
 */
async function main() {
  const config: BackupConfig = {
    neonApiKey: process.env.NEON_API_KEY || '',
    neonProjectId: process.env.NEON_PROJECT_ID || '',
    databaseUrl: process.env.DATABASE_URL || '',
    directUrl: process.env.DIRECT_URL || '',
    backupType: (process.argv[2] as BackupConfig['backupType']) || 'daily',
    retentionDays: parseInt(process.env.RETENTION_DAYS || '30'),
  };

  console.log('🚀 AgendaZap - Neon PostgreSQL Backup');
  console.log('======================================');
  console.log(`Backup type: ${config.backupType}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  if (!config.neonApiKey) {
    console.error('❌ NEON_API_KEY is required');
    process.exit(1);
  }

  if (!config.neonProjectId) {
    console.error('❌ NEON_PROJECT_ID is required');
    process.exit(1);
  }

  // Create branch backup
  console.log('\n📋 Creating branch backup...');
  const result = await createBranchBackup(config);

  if (result.success) {
    console.log(`✅ Branch backup created: ${result.branchName} (ID: ${result.branchId})`);
  } else {
    console.error(`❌ Branch backup failed: ${result.error}`);
    process.exit(1);
  }

  // Cleanup old branches
  console.log('\n🧹 Cleaning up old backup branches...');
  const deleted = await cleanupOldBranches(config);
  console.log(`✅ Deleted ${deleted} old backup branches (retention: ${config.retentionDays} days)`);

  console.log('\n✅ Backup completed successfully!');
}

// Run if called directly
main().catch(console.error);
