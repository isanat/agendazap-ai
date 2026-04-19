import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

// GET - Listar todos os pacotes da conta
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Superadmin não possui conta, retornar array vazio
    if (authUser.role === 'superadmin') {
      return NextResponse.json([]);
    }

    // Usuários normais devem ter uma conta associada
    if (!authUser.accountId) {
      return NextResponse.json(
        { error: 'Usuário sem conta associada' },
        { status: 400 }
      );
    }

    const accountId = authUser.accountId;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const packages = await db.package.findMany({
      where: {
        accountId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        packageServices: {
          include: {
            Service: {
              select: {
                id: true,
                name: true,
                price: true,
                durationMinutes: true,
              },
            },
          },
        },
        _count: {
          select: {
            ClientPackage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular estatísticas
    const packagesWithStats = packages.map((pkg) => {
      const totalServicesPrice = pkg.packageServices.reduce(
        (sum, ps) => sum + ps.Service.price * ps.quantity,
        0
      );
      const discount = pkg.originalPrice > 0 
        ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100) 
        : 0;

      return {
        ...pkg,
        totalServicesPrice,
        discount,
        clientsCount: pkg._count.ClientPackage,
      };
    });

    return NextResponse.json(packagesWithStats);
  } catch (error) {
    console.error('Erro ao buscar pacotes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pacotes' },
      { status: 500 }
    );
  }
}

// POST - Criar novo pacote
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Superadmin não pode criar pacotes (não possui conta)
    if (authUser.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin não pode criar pacotes' },
        { status: 403 }
      );
    }

    // Usuários normais devem ter uma conta associada
    if (!authUser.accountId) {
      return NextResponse.json(
        { error: 'Usuário sem conta associada' },
        { status: 400 }
      );
    }

    const accountId = authUser.accountId;
    const body = await request.json();

    const {
      name,
      description,
      price,
      originalPrice,
      discountPercent,
      totalSessions,
      validityDays,
      services, // Array de { serviceId, quantity }
    } = body;

    // Validar dados
    if (!name || !price || !services || services.length === 0) {
      return NextResponse.json(
        { error: 'Nome, preço e pelo menos um serviço são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se os serviços pertencem à conta
    const serviceIds = services.map((s: { serviceId: string }) => s.serviceId);
    const existingServices = await db.service.findMany({
      where: {
        id: { in: serviceIds },
        accountId,
      },
    });

    if (existingServices.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais serviços não foram encontrados' },
        { status: 400 }
      );
    }

    // Criar pacote com serviços
    const newPackage = await db.package.create({
      data: {
        accountId,
        name,
        description,
        price: parseFloat(price),
        originalPrice: parseFloat(originalPrice) || parseFloat(price),
        discountPercent: parseFloat(discountPercent) || 0,
        totalSessions: parseInt(totalSessions) || 1,
        validityDays: parseInt(validityDays) || 30,
        packageServices: {
          create: services.map((s: { serviceId: string; quantity: number }) => ({
            serviceId: s.serviceId,
            quantity: s.quantity || 1,
          })),
        },
      },
      include: {
        packageServices: {
          include: {
            Service: true,
          },
        },
      },
    });

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pacote:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pacote' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar pacote
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Superadmin não pode atualizar pacotes (não possui conta)
    if (authUser.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin não pode atualizar pacotes' },
        { status: 403 }
      );
    }

    // Usuários normais devem ter uma conta associada
    if (!authUser.accountId) {
      return NextResponse.json(
        { error: 'Usuário sem conta associada' },
        { status: 400 }
      );
    }

    const accountId = authUser.accountId;
    const body = await request.json();

    const {
      id,
      name,
      description,
      price,
      originalPrice,
      discountPercent,
      totalSessions,
      validityDays,
      isActive,
      services,
    } = body;

    // Verificar se o pacote pertence à conta
    const existingPackage = await db.package.findFirst({
      where: { id, accountId },
    });

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'Pacote não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar pacote
    const updatedPackage = await db.package.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        originalPrice: parseFloat(originalPrice) || parseFloat(price),
        discountPercent: parseFloat(discountPercent) || 0,
        totalSessions: parseInt(totalSessions) || 1,
        validityDays: parseInt(validityDays) || 30,
        isActive,
        ...(services && {
          packageServices: {
            deleteMany: {},
            create: services.map((s: { serviceId: string; quantity: number }) => ({
              serviceId: s.serviceId,
              quantity: s.quantity || 1,
            })),
          },
        }),
      },
      include: {
        packageServices: {
          include: {
            Service: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error('Erro ao atualizar pacote:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar pacote' },
      { status: 500 }
    );
  }
}

// DELETE - Remover pacote
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Superadmin não pode excluir pacotes (não possui conta)
    if (authUser.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin não pode excluir pacotes' },
        { status: 403 }
      );
    }

    // Usuários normais devem ter uma conta associada
    if (!authUser.accountId) {
      return NextResponse.json(
        { error: 'Usuário sem conta associada' },
        { status: 400 }
      );
    }

    const accountId = authUser.accountId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do pacote é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o pacote pertence à conta
    const existingPackage = await db.package.findFirst({
      where: { id, accountId },
      include: {
        _count: {
          select: {
            ClientPackage: true,
          },
        },
      },
    });

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'Pacote não encontrado' },
        { status: 404 }
      );
    }

    // Se há clientes com o pacote, apenas desativar
    if (existingPackage._count.ClientPackage > 0) {
      await db.package.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: 'Pacote desativado (há clientes que o possuem)',
      });
    }

    // Se não há clientes, excluir permanentemente
    await db.package.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Pacote excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir pacote:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir pacote' },
      { status: 500 }
    );
  }
}
