import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

// GET - Obter programa de fidelidade da conta
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const accountId = authUser.accountId;

    if (!accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar ou criar programa de fidelidade
    let loyaltyProgram = await db.loyaltyProgram.findUnique({
      where: { accountId },
    });

    if (!loyaltyProgram) {
      loyaltyProgram = await db.loyaltyProgram.create({
        data: {
          accountId,
          name: 'Programa de Fidelidade',
          pointsPerReal: 1,
          redemptionRate: 100,
          minimumPoints: 100,
          maxDiscountPercent: 20,
          pointsExpirationDays: 365,
          welcomeBonus: 0,
          referralBonus: 0,
          isActive: true,
        },
      });
    }

    // Buscar estatísticas
    const stats = await db.loyaltyTransaction.aggregate({
      where: { accountId },
      _sum: {
        points: true,
      },
      _count: {
        id: true,
      },
    });

    const totalEarned = await db.loyaltyTransaction.aggregate({
      where: {
        accountId,
        points: { gt: 0 },
      },
      _sum: { points: true },
    });

    const totalRedeemed = await db.loyaltyTransaction.aggregate({
      where: {
        accountId,
        points: { lt: 0 },
      },
      _sum: { points: true },
    });

    const clientsWithPoints = await db.client.count({
      where: {
        accountId,
        loyaltyPoints: { gt: 0 },
      },
    });

    return NextResponse.json({
      program: loyaltyProgram,
      stats: {
        totalPoints: stats._sum?.points ?? 0,
        totalTransactions: (stats._count as { id?: number } | undefined)?.id ?? 0,
        totalEarned: totalEarned._sum?.points ?? 0,
        totalRedeemed: Math.abs(totalRedeemed._sum?.points ?? 0),
        clientsWithPoints,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar programa de fidelidade:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar programa de fidelidade' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar programa de fidelidade
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const accountId = authUser.accountId;

    if (!accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const {
      name,
      pointsPerReal,
      redemptionRate,
      minimumPoints,
      maxDiscountPercent,
      pointsExpirationDays,
      welcomeBonus,
      referralBonus,
      isActive,
    } = body;

    const updatedProgram = await db.loyaltyProgram.upsert({
      where: { accountId },
      update: {
        name,
        pointsPerReal: parseFloat(pointsPerReal),
        redemptionRate: parseFloat(redemptionRate),
        minimumPoints: parseInt(minimumPoints),
        maxDiscountPercent: parseFloat(maxDiscountPercent),
        pointsExpirationDays: parseInt(pointsExpirationDays),
        welcomeBonus: parseInt(welcomeBonus) || 0,
        referralBonus: parseInt(referralBonus) || 0,
        isActive,
      },
      create: {
        accountId,
        name,
        pointsPerReal: parseFloat(pointsPerReal),
        redemptionRate: parseFloat(redemptionRate),
        minimumPoints: parseInt(minimumPoints),
        maxDiscountPercent: parseFloat(maxDiscountPercent),
        pointsExpirationDays: parseInt(pointsExpirationDays),
        welcomeBonus: parseInt(welcomeBonus) || 0,
        referralBonus: parseInt(referralBonus) || 0,
        isActive,
      },
    });

    return NextResponse.json(updatedProgram);
  } catch (error) {
    console.error('Erro ao atualizar programa de fidelidade:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar programa de fidelidade' },
      { status: 500 }
    );
  }
}
