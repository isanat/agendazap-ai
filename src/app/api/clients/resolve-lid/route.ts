import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth-helpers';
import {
  resolveLidToPhone,
  isValidPhoneNumber,
  saveLidMapping,
  updateLidMappingAttempt,
  migrateClientLidToPhone,
  getInstanceForAccount,
} from '@/lib/lid-resolution';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Get a fresh PrismaClient with all models (including LidMapping)
// The cached singleton from db.ts may not have LidMapping after schema changes
function getDb() {
  const globalForPrisma = globalThis as unknown as { _resolveLidPrisma: PrismaClient | undefined };
  if (!globalForPrisma._resolveLidPrisma) {
    globalForPrisma._resolveLidPrisma = new PrismaClient({
      log: ['error'],
    });
  }
  return globalForPrisma._resolveLidPrisma;
}

/**
 * GET /api/clients/resolve-lid?accountId=XXX
 * 
 * Get all unresolved LIDs for an account.
 * Business owners can see which clients have unresolved phone numbers
 * from WhatsApp LID (Linked ID) privacy format.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let accountId = searchParams.get('accountId');

    // Fallback: try x-account-id header from authFetch
    if (!accountId) {
      accountId = request.headers.get('x-account-id');
    }

    // Fallback: try auth user session
    if (!accountId) {
      const authUser = await getAuthUser(request);
      if (authUser?.accountId) {
        accountId = authUser.accountId;
      }
    }

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    // Verify account access
    const authUser = await getAuthUser(request);
    if (authUser && authUser.role !== 'superadmin' && authUser.accountId !== accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Find clients with LID-based or JID-based phone identifiers
    const lidClients = await getDb().client.findMany({
      where: {
        accountId,
        OR: [
          { phone: { startsWith: 'lid:' } },
          { phone: { startsWith: 'jid:' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        _count: {
          select: { Appointment: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get LidMapping records for these LIDs
    const lidValues = lidClients.map(c => c.phone.replace('lid:', '').replace('jid:', ''));

    const lidMappings = await getDb().lidMapping.findMany({
      where: {
        lid: { in: lidValues },
      },
    });

    const lidMappingByLid = new Map(lidMappings.map(m => [m.lid, m]));

    // Build the unresolved list
    const unresolved = lidClients.map(client => {
      const lidVal = client.phone.replace('lid:', '').replace('jid:', '');
      const mapping = lidMappingByLid.get(lidVal);

      return {
        clientId: client.id,
        clientName: client.name,
        lidValue: lidVal,
        lidJid: `${lidVal}@lid`,
        clientPhone: client.phone,
        appointmentCount: client._count.Appointment,
        lidMapping: mapping ? {
          status: mapping.status,
          attemptCount: mapping.attemptCount,
          lastAttemptAt: mapping.lastAttemptAt?.toISOString() || null,
          resolvedPhone: mapping.resolvedPhone,
          resolutionMethod: mapping.resolutionMethod,
          resolvedAt: mapping.resolvedAt?.toISOString() || null,
        } : null,
      };
    });

    // Count totals
    const totalResolved = lidMappings.filter(m => m.status === 'resolved').length;
    const totalUnresolved = lidMappings.filter(m => m.status !== 'resolved').length;

    return NextResponse.json({
      unresolved,
      totalUnresolved,
      totalResolved,
    });
  } catch (error) {
    console.error('[resolve-lid] Error fetching unresolved LIDs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/clients/resolve-lid
 * 
 * Retry resolving a specific LID or all pending LIDs.
 * 
 * Body:
 * - accountId: string (required)
 * - lidValue: string (optional - if provided, resolve just this one; if not, resolve all pending)
 * - instanceName: string (optional - Evolution API instance name)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { accountId, lidValue, instanceName } = body;

    // Fallback: try x-account-id header from authFetch
    if (!accountId) {
      accountId = request.headers.get('x-account-id');
    }

    // Fallback: try auth user session
    if (!accountId) {
      const authUser = await getAuthUser(request);
      if (authUser?.accountId) {
        accountId = authUser.accountId;
      }
    }

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    // Verify account access
    const authUser = await getAuthUser(request);
    if (authUser && authUser.role !== 'superadmin' && authUser.accountId !== accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get instance name if not provided
    if (!instanceName) {
      instanceName = (await getInstanceForAccount(accountId)) || undefined;
    }

    if (!instanceName) {
      return NextResponse.json(
        { error: 'No WhatsApp instance found for this account. Please configure WhatsApp integration first.' },
        { status: 400 }
      );
    }

    // Find LIDs to resolve
    let lidsToResolve: Array<{
      lidValue: string;
      lidJid: string;
      clientId?: string;
      clientName?: string;
      mappingId?: string;
      currentAttemptCount: number;
    }>;

    if (lidValue) {
      // Resolve a specific LID
      const mapping = await getDb().lidMapping.findUnique({
        where: { lid: lidValue },
      });

      if (!mapping) {
        // Create a new mapping entry and try to resolve
        const lidJid = `${lidValue}@lid`;
        await saveLidMapping(lidValue, lidJid, instanceName);

        lidsToResolve = [{
          lidValue,
          lidJid,
          currentAttemptCount: 0,
        }];
      } else if (mapping.status === 'resolved') {
        return NextResponse.json({
          message: `LID ${lidValue} is already resolved to ${mapping.resolvedPhone}`,
          results: [{
            lidValue,
            status: 'already_resolved' as const,
            resolvedPhone: mapping.resolvedPhone,
            resolutionMethod: mapping.resolutionMethod,
          }],
          resolved: 1,
          failed: 0,
          pending: 0,
        });
      } else {
        // Find client associated with this LID
        const client = await getDb().client.findFirst({
          where: {
            accountId,
            OR: [
              { phone: `lid:${lidValue}` },
              { phone: `jid:${lidValue}` },
            ],
          },
        });

        lidsToResolve = [{
          lidValue,
          lidJid: mapping.lidJid,
          clientId: client?.id,
          clientName: client?.name,
          mappingId: mapping.id,
          currentAttemptCount: mapping.attemptCount,
        }];
      }
    } else {
      // Resolve all pending LIDs for this account
      // First, find all clients with LID-based phones
      const lidClients = await getDb().client.findMany({
        where: {
          accountId,
          OR: [
            { phone: { startsWith: 'lid:' } },
            { phone: { startsWith: 'jid:' } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      });

      // Get all pending/failed LidMappings
      const pendingMappings = await getDb().lidMapping.findMany({
        where: {
          status: { in: ['pending', 'failed'] },
        },
      });

      const lidClientMap = new Map<string, { id: string; name: string }>();
      for (const client of lidClients) {
        const lid = client.phone.replace('lid:', '').replace('jid:', '');
        lidClientMap.set(lid, { id: client.id, name: client.name });
      }

      // Combine: clients with LID phones that may not have a mapping yet,
      // plus existing pending/failed mappings
      const processedLids = new Set<string>();

      lidsToResolve = [];

      // Add clients with LID-based phones
      for (const client of lidClients) {
        const lid = client.phone.replace('lid:', '').replace('jid:', '');
        if (processedLids.has(lid)) continue;
        processedLids.add(lid);

        const mapping = pendingMappings.find(m => m.lid === lid);
        lidsToResolve.push({
          lidValue: lid,
          lidJid: mapping?.lidJid || `${lid}@lid`,
          clientId: client.id,
          clientName: client.name,
          mappingId: mapping?.id,
          currentAttemptCount: mapping?.attemptCount || 0,
        });
      }

      // Add pending mappings that don't have a matching client
      for (const mapping of pendingMappings) {
        if (processedLids.has(mapping.lid)) continue;
        processedLids.add(mapping.lid);

        // Check if there's a client in this account with this LID
        const clientInfo = lidClientMap.get(mapping.lid);
        lidsToResolve.push({
          lidValue: mapping.lid,
          lidJid: mapping.lidJid,
          clientId: clientInfo?.id,
          clientName: clientInfo?.name,
          mappingId: mapping.id,
          currentAttemptCount: mapping.attemptCount,
        });
      }

      // Limit batch size to avoid overwhelming the Evolution API
      if (lidsToResolve.length > 50) {
        lidsToResolve = lidsToResolve.slice(0, 50);
      }
    }

    // Resolve each LID
    const results: Array<{
      lidValue: string;
      clientId?: string;
      clientName?: string;
      status: 'resolved' | 'failed' | 'pending' | 'skipped';
      resolvedPhone?: string | null;
      resolutionMethod?: string | null;
      migrationResult?: { success: boolean; action: string; message: string };
      error?: string;
    }> = [];

    let resolved = 0;
    let failed = 0;
    let pending = 0;

    for (const lid of lidsToResolve) {
      try {
        // Skip if already has too many attempts
        if (lid.currentAttemptCount >= 10) {
          results.push({
            lidValue: lid.lidValue,
            clientId: lid.clientId,
            clientName: lid.clientName,
            status: 'skipped',
            error: `Max attempts reached (${lid.currentAttemptCount} attempts). Use a different resolution method.`,
          });
          failed++;
          continue;
        }

        // Try to resolve using the shared utility
        const lidIdentifier = `lid:${lid.lidValue}`;
        const resolvedPhone = await resolveLidToPhone(instanceName!, lidIdentifier);

        if (resolvedPhone && isValidPhoneNumber(resolvedPhone)) {
          // Successfully resolved!
          resolved++;

          let migrationResult = null;

          // If we have a client ID, migrate the client record
          if (lid.clientId) {
            migrationResult = await migrateClientLidToPhone(
              lid.clientId,
              lid.lidValue,
              resolvedPhone
            );
          }

          results.push({
            lidValue: lid.lidValue,
            clientId: lid.clientId,
            clientName: lid.clientName,
            status: 'resolved',
            resolvedPhone,
            resolutionMethod: 'evolution-api',
            migrationResult: migrationResult ? {
              success: migrationResult.success,
              action: migrationResult.action,
              message: migrationResult.message,
            } : undefined,
          });
        } else {
          // Resolution failed
          const newStatus = await updateLidMappingAttempt({
            lidValue: lid.lidValue,
            instanceName,
            failed: true,
          });

          if (newStatus === 'failed') {
            failed++;
          } else {
            pending++;
          }

          results.push({
            lidValue: lid.lidValue,
            clientId: lid.clientId,
            clientName: lid.clientName,
            status: newStatus,
            error: 'Could not resolve LID to a valid phone number via Evolution API',
          });
        }

        // Small delay between resolutions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        results.push({
          lidValue: lid.lidValue,
          clientId: lid.clientId,
          clientName: lid.clientName,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: lidValue
        ? `Resolution attempt for LID ${lidValue}: ${resolved > 0 ? 'resolved' : 'failed'}`
        : `Batch resolution complete: ${resolved} resolved, ${failed} failed, ${pending} pending`,
      results,
      resolved,
      failed,
      pending,
      totalProcessed: results.length,
    });
  } catch (error) {
    console.error('[resolve-lid] Error resolving LIDs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
