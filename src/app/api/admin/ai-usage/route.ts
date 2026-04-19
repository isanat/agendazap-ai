import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/ai-usage
 * Get AI usage statistics (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    // Build filter
    const where: Record<string, unknown> = {};
    
    if (accountId) {
      where.accountId = accountId;
    }
    
    if (periodStart || periodEnd) {
      where.createdAt = {};
      if (periodStart) {
        (where.createdAt as Record<string, string>).gte = periodStart;
      }
      if (periodEnd) {
        (where.createdAt as Record<string, string>).lte = periodEnd;
      }
    }

    // Get overall stats
    const overallStats = await db.aITokenUsage.aggregate({
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUsd: true
      },
      _count: true
    });

    // Get stats by provider
    const byProvider = await db.aITokenUsage.groupBy({
      by: ['providerId'],
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUsd: true
      },
      _count: true
    });

    // Get provider names
    const providerIds = byProvider.map(p => p.providerId);
    const providers = await db.aIProvider.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, name: true, displayName: true }
    });
    const providerMap = new Map(providers.map(p => [p.id, p]));

    // Get stats by account (top 10)
    const byAccount = await db.aITokenUsage.groupBy({
      by: ['accountId'],
      where,
      _sum: {
        totalTokens: true,
        costUsd: true
      },
      _count: true,
      orderBy: {
        _sum: {
          totalTokens: 'desc'
        }
      },
      take: 10
    });

    // Get account names
    const accountIds = byAccount.map(a => a.accountId);
    const accounts = await db.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, businessName: true }
    });
    const accountMap = new Map(accounts.map(a => [a.id, a]));

    // Get daily usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyUsageRaw = await db.$queryRaw<Array<{ date: Date; tokens: bigint; cost: number }>>`
      SELECT 
        DATE("createdAt") as date,
        SUM("totalTokens") as tokens,
        SUM("costUsd") as cost
      FROM "AITokenUsage"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    const dailyUsage = dailyUsageRaw.map(d => ({
      date: d.date,
      tokens: Number(d.tokens),
      cost: Number(d.cost)
    }));

    return NextResponse.json({
      success: true,
      overall: {
        inputTokens: Number(overallStats._sum.inputTokens || 0),
        outputTokens: Number(overallStats._sum.outputTokens || 0),
        totalTokens: Number(overallStats._sum.totalTokens || 0),
        totalCost: Number(overallStats._sum.costUsd || 0),
        requestCount: overallStats._count
      },
      byProvider: byProvider.map(p => ({
        provider: providerMap.get(p.providerId)?.name || 'unknown',
        displayName: providerMap.get(p.providerId)?.displayName || 'Unknown',
        inputTokens: Number(p._sum.inputTokens || 0),
        outputTokens: Number(p._sum.outputTokens || 0),
        totalTokens: Number(p._sum.totalTokens || 0),
        cost: Number(p._sum.costUsd || 0),
        requestCount: p._count
      })),
      byAccount: byAccount.map(a => ({
        accountId: a.accountId,
        businessName: accountMap.get(a.accountId)?.businessName || 'Unknown',
        totalTokens: Number(a._sum.totalTokens || 0),
        cost: Number(a._sum.costUsd || 0),
        requestCount: a._count
      })),
      dailyUsage
    });

  } catch (error) {
    console.error('[AI Usage API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage statistics' },
      { status: 500 }
    );
  }
}
