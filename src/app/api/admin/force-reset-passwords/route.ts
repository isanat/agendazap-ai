import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

/**
 * Force reset all user passwords - maintenance endpoint
 * Requires SETUP_KEY for security (same as /api/setup)
 * 
 * POST /api/admin/force-reset-passwords
 * Body: { setupKey: string, password: string (optional, defaults to @!Isa46936698) }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { setupKey, password } = body;

    // Security: require setup key
    const validSetupKey = process.env.SETUP_KEY || 'agendazap-setup-2024';
    
    if (setupKey !== validSetupKey) {
      return NextResponse.json({ error: 'Chave de configuração inválida' }, { status: 403 });
    }

    const newPassword = password || '@!Isa46936698';
    
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Get all users
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'Nenhum usuário encontrado' }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12);

    // Update all users with the new password
    const results = [];
    for (const user of users) {
      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      // Revoke all refresh tokens (force re-login)
      await db.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true }
      });

      results.push({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        passwordReset: true
      });
    }

    console.log(`[ForceReset] Passwords reset for ${users.length} users`);

    return NextResponse.json({
      success: true,
      message: `Senhas redefinidas para ${users.length} usuários`,
      password: newPassword,
      users: results
    });

  } catch (error) {
    console.error('[ForceReset] Error:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
