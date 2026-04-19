import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

// GET - Obter pontos e histórico de um cliente
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const accountId = authUser.accountId;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar cliente com pontos
    const client = await db.client.findFirst({
      where: { id: clientId, accountId },
      include: {
        LoyaltyTransaction: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Buscar programa de fidelidade
    const program = await db.loyaltyProgram.findUnique({
      where: { accountId },
    });

    // Calcular valor disponível
    const availableDiscount = program
      ? (client.loyaltyPoints / program.redemptionRate) *
        (1 - program.maxDiscountPercent / 100)
      : 0;

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        loyaltyPoints: client.loyaltyPoints,
      },
      transactions: client.LoyaltyTransaction,
      program,
      availableDiscount,
      canRedeem: program && client.loyaltyPoints >= program.minimumPoints,
    });
  } catch (error) {
    console.error('Erro ao buscar pontos do cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pontos do cliente' },
      { status: 500 }
    );
  }
}

// POST - Adicionar ou resgatar pontos
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const accountId = authUser.accountId;
    const body = await request.json();

    const { clientId, points, type, description, appointmentId } = body;

    // Validar
    if (!clientId || points === undefined || !type) {
      return NextResponse.json(
        { error: 'Cliente, pontos e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar tipo válido
    const validTypes = ['earn', 'redeem', 'expire', 'bonus', 'referral'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de transação inválido' },
        { status: 400 }
      );
    }

    // Verificar cliente
    const client = await db.client.findFirst({
      where: { id: clientId, accountId },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Buscar programa para expiração
    const program = await db.loyaltyProgram.findUnique({
      where: { accountId },
    });

    // Calcular data de expiração
    let expiryDate = null;
    if (points > 0 && program) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + program.pointsExpirationDays);
    }

    // Para resgate, verificar se tem pontos suficientes
    if (type === 'redeem') {
      if (client.loyaltyPoints < Math.abs(points)) {
        return NextResponse.json(
          { error: 'Pontos insuficientes para resgate' },
          { status: 400 }
        );
      }

      // Verificar mínimo de pontos
      if (program && Math.abs(points) < program.minimumPoints) {
        return NextResponse.json(
          { error: `Mínimo de ${program.minimumPoints} pontos para resgate` },
          { status: 400 }
        );
      }
    }

    // Criar transação e atualizar pontos do cliente
    const [transaction, updatedClient] = await db.$transaction([
      db.loyaltyTransaction.create({
        data: {
          accountId,
          clientId,
          points: type === 'redeem' || type === 'expire' ? -Math.abs(points) : Math.abs(points),
          type,
          description,
          appointmentId,
          expiryDate,
        },
      }),
      db.client.update({
        where: { id: clientId },
        data: {
          loyaltyPoints: {
            increment: type === 'redeem' || type === 'expire' ? -Math.abs(points) : Math.abs(points),
          },
        },
      }),
    ]);

    return NextResponse.json({
      transaction,
      client: updatedClient,
    });
  } catch (error) {
    console.error('Erro ao processar pontos:', error);
    return NextResponse.json(
      { error: 'Erro ao processar pontos' },
      { status: 500 }
    );
  }
}
