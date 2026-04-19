import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

// GET - Listar todos os planos
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmin pode acessar.' }, { status: 403 });
    }

    const plans = await db.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { AccountSubscription: true }
        }
      }
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar novo plano
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmin pode acessar.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      displayName,
      description,
      priceMonthly,
      priceYearly,
      maxProfessionals,
      maxServices,
      maxAppointmentsMonth,
      maxClients,
      includeWhatsApp,
      includeAiAssistant,
      includeGoogleCalendar,
      includeMercadoPago,
      includeNfsE,
      includeReports,
      includeCustomDomain,
      includePrioritySupport,
      isActive,
      isPopular,
      sortOrder,
    } = body;

    // Verificar se já existe um plano com este nome
    const existingPlan = await db.subscriptionPlan.findUnique({
      where: { name }
    });

    if (existingPlan) {
      return NextResponse.json({ error: 'Já existe um plano com este nome' }, { status: 400 });
    }

    const plan = await db.subscriptionPlan.create({
      data: {
        name,
        displayName,
        description,
        priceMonthly: parseFloat(priceMonthly) || 0,
        priceYearly: parseFloat(priceYearly) || 0,
        maxProfessionals: parseInt(maxProfessionals) || 1,
        maxServices: parseInt(maxServices) || 10,
        maxAppointmentsMonth: parseInt(maxAppointmentsMonth) || 100,
        maxClients: parseInt(maxClients) || 500,
        includeWhatsApp: includeWhatsApp ?? true,
        includeAiAssistant: includeAiAssistant ?? false,
        includeGoogleCalendar: includeGoogleCalendar ?? false,
        includeMercadoPago: includeMercadoPago ?? true,
        includeNfsE: includeNfsE ?? false,
        includeReports: includeReports ?? true,
        includeCustomDomain: includeCustomDomain ?? false,
        includePrioritySupport: includePrioritySupport ?? false,
        isActive: isActive ?? true,
        isPopular: isPopular ?? false,
        sortOrder: parseInt(sortOrder) || 0,
      }
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar plano
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmin pode acessar.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do plano é obrigatório' }, { status: 400 });
    }

    // Preparar dados numéricos
    const dataToUpdate: Record<string, unknown> = { ...updateData };
    if (updateData.priceMonthly !== undefined) dataToUpdate.priceMonthly = parseFloat(updateData.priceMonthly);
    if (updateData.priceYearly !== undefined) dataToUpdate.priceYearly = parseFloat(updateData.priceYearly);
    if (updateData.maxProfessionals !== undefined) dataToUpdate.maxProfessionals = parseInt(updateData.maxProfessionals);
    if (updateData.maxServices !== undefined) dataToUpdate.maxServices = parseInt(updateData.maxServices);
    if (updateData.maxAppointmentsMonth !== undefined) dataToUpdate.maxAppointmentsMonth = parseInt(updateData.maxAppointmentsMonth);
    if (updateData.maxClients !== undefined) dataToUpdate.maxClients = parseInt(updateData.maxClients);
    if (updateData.sortOrder !== undefined) dataToUpdate.sortOrder = parseInt(updateData.sortOrder);

    const plan = await db.subscriptionPlan.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir plano
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (authUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas superadmin pode acessar.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do plano é obrigatório' }, { status: 400 });
    }

    // Verificar se há assinaturas usando este plano
    const subscriptionsCount = await db.accountSubscription.count({
      where: { planId: id }
    });

    if (subscriptionsCount > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir este plano',
        message: `Existem ${subscriptionsCount} assinaturas usando este plano. Desative-o em vez de excluir.`
      }, { status: 400 });
    }

    await db.subscriptionPlan.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir plano:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
