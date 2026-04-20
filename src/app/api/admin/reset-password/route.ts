import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, isSuperAdmin } from '@/lib/auth-helpers';
import { hash } from 'bcryptjs';

// POST - Reset a user's password (superadmin only)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Only superadmin can reset passwords
    const isSuper = await isSuperAdmin(request);
    if (!isSuper) {
      return NextResponse.json({ error: 'Apenas superadmin pode redefinir senhas' }, { status: 403 });
    }

    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email e nova senha são obrigatórios' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 12);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Revoke all refresh tokens for this user (force re-login)
    await db.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true }
    });

    console.log(`[Admin] Password reset for ${email} by ${authUser.email}`);

    return NextResponse.json({
      success: true,
      message: `Senha redefinida para ${email}`,
    });
  } catch (error) {
    console.error('[Admin] Error resetting password:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
