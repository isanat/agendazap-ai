import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

// GET - Listar pacotes de um cliente
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

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      );
    }

    const clientPackages = await db.clientPackage.findMany({
      where: {
        accountId,
        clientId,
      },
      include: {
        Package: {
          include: {
            packageServices: {
              include: {
                Service: true,
              },
            },
          },
        },
        PackageUsage: {
          orderBy: {
            usedAt: 'desc',
          },
          take: 10,
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    // Verificar expiração
    const now = new Date();
    const updatedPackages = clientPackages.map((cp) => {
      const isExpired = cp.expiryDate < now && cp.status === 'active';
      const remainingSessions = cp.totalSessions - cp.usedSessions;

      return {
        ...cp,
        isExpired,
        remainingSessions,
        progress: Math.round((cp.usedSessions / cp.totalSessions) * 100),
      };
    });

    return NextResponse.json(updatedPackages);
  } catch (error) {
    console.error('Erro ao buscar pacotes do cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pacotes do cliente' },
      { status: 500 }
    );
  }
}

// POST - Vender pacote para cliente
export async function POST(request: NextRequest) {
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

    const { clientId, packageId, paymentMethod, paid } = body;

    // Validar
    if (!clientId || !packageId) {
      return NextResponse.json(
        { error: 'Cliente e pacote são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se cliente e pacote existem e pertencem à conta
    const [client, pkg] = await Promise.all([
      db.client.findFirst({
        where: { id: clientId, accountId },
      }),
      db.package.findFirst({
        where: { id: packageId, accountId, isActive: true },
      }),
    ]);

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    if (!pkg) {
      return NextResponse.json(
        { error: 'Pacote não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Calcular data de expiração
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + pkg.validityDays);

    // Criar pacote do cliente
    const clientPackage = await db.clientPackage.create({
      data: {
        accountId,
        clientId,
        packageId,
        expiryDate,
        totalSessions: pkg.totalSessions,
        price: pkg.price,
        paymentMethod,
        paid: paid || false,
      },
      include: {
        Package: {
          include: {
            packageServices: {
              include: {
                Service: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(clientPackage, { status: 201 });
  } catch (error) {
    console.error('Erro ao vender pacote:', error);
    return NextResponse.json(
      { error: 'Erro ao vender pacote' },
      { status: 500 }
    );
  }
}

// PUT - Usar sessão do pacote
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

    const { clientPackageId, appointmentId, notes } = body;

    if (!clientPackageId) {
      return NextResponse.json(
        { error: 'ID do pacote do cliente é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o pacote pertence à conta e está ativo
    const clientPackage = await db.clientPackage.findFirst({
      where: {
        id: clientPackageId,
        accountId,
        status: 'active',
      },
    });

    if (!clientPackage) {
      return NextResponse.json(
        { error: 'Pacote não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Verificar se ainda há sessões disponíveis
    if (clientPackage.usedSessions >= clientPackage.totalSessions) {
      return NextResponse.json(
        { error: 'Não há sessões disponíveis neste pacote' },
        { status: 400 }
      );
    }

    // Verificar expiração
    if (clientPackage.expiryDate < new Date()) {
      await db.clientPackage.update({
        where: { id: clientPackageId },
        data: { status: 'expired' },
      });
      return NextResponse.json(
        { error: 'Este pacote expirou' },
        { status: 400 }
      );
    }

    // Atualizar uso
    const newUsedSessions = clientPackage.usedSessions + 1;
    const newStatus = newUsedSessions >= clientPackage.totalSessions ? 'used' : 'active';

    const updatedPackage = await db.clientPackage.update({
      where: { id: clientPackageId },
      data: {
        usedSessions: newUsedSessions,
        status: newStatus,
        PackageUsage: {
          create: {
            appointmentId,
            notes,
          },
        },
      },
      include: {
        PackageUsage: {
          orderBy: { usedAt: 'desc' },
          take: 5,
        },
      },
    });

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error('Erro ao usar sessão do pacote:', error);
    return NextResponse.json(
      { error: 'Erro ao usar sessão do pacote' },
      { status: 500 }
    );
  }
}
