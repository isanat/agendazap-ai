import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * Mask API key for display (show first 3 and last 4 characters)
 * e.g., "sk-proj-abc123xyz" -> "sk-•••••••xyz"
 */
function maskApiKey(key: string | null | undefined): string {
  if (!key || key.length === 0) return '';
  if (key === 'environment') return 'environment'; // Special case for Z.ai
  if (key.length <= 7) return '•••••••';
  
  const start = key.substring(0, 3);
  const end = key.substring(key.length - 4);
  return `${start}•••••••${end}`;
}

/**
 * GET /api/admin/ai-providers
 * List all AI providers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';

    const providers = await db.aIProvider.findMany({
      orderBy: { priority: 'asc' }
    });

    if (includeStats) {
      // Get usage stats for each provider
      const stats = await db.aITokenUsage.groupBy({
        by: ['providerId'],
        _sum: {
          totalTokens: true,
          costUsd: true
        },
        _count: true
      });

      const statsMap = new Map(stats.map(s => [s.providerId, s]));
      
      const providersWithStats = providers.map(p => ({
        ...p,
        apiKey: maskApiKey(p.apiKey),
        hasApiKey: !!p.apiKey && p.apiKey.length > 0,
        totalTokensUsed: Number(p.totalTokensUsed), // Convert BigInt to Number
        stats: statsMap.get(p.id) ? {
          totalTokens: Number(statsMap.get(p.id)?._sum.totalTokens || 0),
          totalCost: Number(statsMap.get(p.id)?._sum.costUsd || 0),
          requestCount: statsMap.get(p.id)?._count || 0
        } : null
      }));

      return NextResponse.json({ providers: providersWithStats });
    }

    // Return masked API keys for UI feedback (sk_•••••••1234 format)
    // and convert BigInt to Number
    const safeProviders = providers.map(p => ({
      ...p,
      apiKey: maskApiKey(p.apiKey),
      hasApiKey: !!p.apiKey && p.apiKey.length > 0,
      totalTokensUsed: Number(p.totalTokensUsed)
    }));

    return NextResponse.json({ providers: safeProviders });

  } catch (error) {
    console.error('[AI Providers API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-providers
 * Create a new AI provider
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      displayName,
      apiKey,
      baseUrl,
      model,
      priority,
      costPerInputToken,
      costPerOutputToken,
      rateLimitPerMinute,
      maxTokensPerRequest,
      timeoutMs
    } = body;

    if (!name || !displayName || !apiKey) {
      return NextResponse.json(
        { error: 'name, displayName, and apiKey are required' },
        { status: 400 }
      );
    }

    const provider = await db.aIProvider.create({
      data: {
        id: nanoid(),
        name: name.toLowerCase(),
        displayName,
        apiKey, // In production, encrypt this!
        baseUrl: baseUrl || null,
        model: model || 'default',
        priority: priority || 0,
        isEnabled: true,
        costPerInputToken: costPerInputToken || 0,
        costPerOutputToken: costPerOutputToken || 0,
        rateLimitPerMinute: rateLimitPerMinute || 60,
        maxTokensPerRequest: maxTokensPerRequest || 4096,
        timeoutMs: timeoutMs || 30000,
        updatedAt: new Date()
      }
    });

    // Hide API key in response and convert BigInt to Number
    const { apiKey: _, ...safeProvider } = provider;

    return NextResponse.json({ 
      provider: {
        ...safeProvider,
        totalTokensUsed: Number(provider.totalTokensUsed)
      } 
    });

  } catch (error: unknown) {
    console.error('[AI Providers API] Error creating provider:', error);
    
    // Check for unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Provider with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create AI provider' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ai-providers
 * Update an AI provider
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.totalRequests;
    delete updates.totalTokensUsed;
    delete updates.totalErrors;

    // Clean up empty strings - convert to null for optional fields
    // and remove fields that shouldn't be updated (empty apiKey means keep current)
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      // Skip empty apiKey - means keep current
      if (key === 'apiKey' && (value === '' || value === null || value === undefined)) {
        continue;
      }
      // Convert empty baseUrl to null
      if (key === 'baseUrl' && value === '') {
        cleanUpdates[key] = null;
        continue;
      }
      // Skip other empty strings (keep existing value)
      if (value === '') {
        continue;
      }
      cleanUpdates[key] = value;
    }

    const provider = await db.aIProvider.update({
      where: { id },
      data: {
        ...cleanUpdates,
        updatedAt: new Date()
      }
    });

    // Hide API key in response and convert BigInt to Number
    const { apiKey: _, ...safeProvider } = provider;

    return NextResponse.json({ 
      provider: {
        ...safeProvider,
        totalTokensUsed: Number(provider.totalTokensUsed)
      } 
    });

  } catch (error) {
    console.error('[AI Providers API] Error updating provider:', error);
    return NextResponse.json(
      { error: 'Failed to update AI provider' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai-providers
 * Delete an AI provider
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    await db.aIProvider.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[AI Providers API] Error deleting provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI provider' },
      { status: 500 }
    );
  }
}
