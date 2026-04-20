import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

/**
 * API para configurar um usuário de demonstração
 * Útil para testes e primeira configuração
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, businessName, setupKey } = body;

    // Security: require a setup key (can be any string, set in .env)
    const validSetupKey = process.env.SETUP_KEY || 'agendazap-setup-2024';
    
    if (setupKey !== validSetupKey) {
      return NextResponse.json({ error: 'Chave de configuração inválida' }, { status: 403 });
    }

    if (!email || !password || !name || !businessName) {
      return NextResponse.json({ 
        error: 'Todos os campos são obrigatórios: email, password, name, businessName' 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Usuário já existe',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
        }
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create account and user in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create user first (Account references User via ownerId)
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'owner',
          isActive: true,
        }
      });

      // Create account with ownerId referencing the user
      const account = await tx.account.create({
        data: {
          businessName,
          businessType: 'salon',
          whatsappNumber: '(11) 99999-0000',
          plan: 'pro',
          noShowFeeEnabled: true,
          noShowFeeAmount: 50,
          ownerId: user.id,
        }
      });

      // Create default services
      await tx.service.createMany({
        data: [
          { accountId: account.id, name: 'Corte Feminino', durationMinutes: 60, price: 80, category: 'Corte', isActive: true },
          { accountId: account.id, name: 'Corte Masculino', durationMinutes: 30, price: 45, category: 'Corte', isActive: true },
          { accountId: account.id, name: 'Barba', durationMinutes: 30, price: 35, category: 'Barba', isActive: true },
          { accountId: account.id, name: 'Manicure', durationMinutes: 45, price: 40, category: 'Unhas', isActive: true },
          { accountId: account.id, name: 'Pedicure', durationMinutes: 45, price: 45, category: 'Unhas', isActive: true },
          { accountId: account.id, name: 'Hidratação', durationMinutes: 60, price: 100, category: 'Tratamento', isActive: true },
          { accountId: account.id, name: 'Coloração', durationMinutes: 120, price: 180, category: 'Coloração', isActive: true },
          { accountId: account.id, name: 'Mechas', durationMinutes: 180, price: 280, category: 'Coloração', isActive: true },
        ]
      });

      // Create default professional
      await tx.professional.create({
        data: {
          accountId: account.id,
          name: 'Ana Silva',
          email: 'ana@exemplo.com',
          phone: '(11) 99999-1234',
          color: '#10B981',
          isActive: true,
        }
      });

      return { user, account };
    });

    return NextResponse.json({
      success: true,
      message: 'Configuração concluída com sucesso!',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        accountId: result.account.id,
      },
      account: {
        id: result.account.id,
        businessName: result.account.businessName,
      }
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Erro ao configurar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Check if setup is needed
 */
export async function GET() {
  try {
    const userCount = await db.user.count();
    
    return NextResponse.json({
      needsSetup: userCount === 0,
      userCount,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
