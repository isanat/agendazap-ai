import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serialize } from 'cookie';
import { compare } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      include: { Account: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Usuário desativado' },
        { status: 403 }
      );
    }

    // Detect legacy hash (simpleHash produces base64/hex strings that don't start with $2)
    // Bcrypt hashes always start with $2a$, $2b$, or $2y$
    const isLegacyHash = !user.password.startsWith('$2');

    if (isLegacyHash) {
      // Migrate the password to bcrypt automatically for superadmin
      if (user.role === 'superadmin') {
        console.log('[Login] Auto-migrating superadmin password to bcrypt...');
        const { hash } = await import('bcryptjs');
        const hashedPassword = await hash(password, 12);
        await db.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
        console.log('[Login] Superadmin password migrated successfully!');
        // Continue with normal login flow
      } else {
        // For security, require password reset for other legacy hashes
        console.warn(`[Login] User ${user.email} has legacy password hash - password reset required`);
        return NextResponse.json(
          { 
            error: 'Por segurança, sua senha precisa ser redefinida. Use a opção "Esqueci minha senha".',
            requirePasswordReset: true 
          },
          { status: 401 }
        );
      }
    }

    // Re-fetch user if we just migrated the password
    const updatedUser = isLegacyHash && user.role === 'superadmin' 
      ? await db.user.findUnique({ where: { id: user.id }, include: { Account: true } })
      : user;

    // Verify password with bcrypt only
    const passwordValid = await compare(password, updatedUser!.password);

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Use updatedUser for session
    const sessionUser = updatedUser!;

    // Create session data
    const sessionData = JSON.stringify({
      userId: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
      accountId: sessionUser.Account?.id || null,
    });

    // Encode session
    const encodedSession = Buffer.from(sessionData).toString('base64');

    // Set cookie
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookie = serialize('agendazap_session', encodedSession, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    
    console.log('[Login] Setting cookie for user:', sessionUser.email, 'isProduction:', isProduction);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          role: sessionUser.role,
          accountId: sessionUser.Account?.id || null,
        },
      },
      {
        headers: { 'Set-Cookie': cookie },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get current session
export async function GET(request: NextRequest) {
  try {
    // Try cookie-based session first
    const cookieHeader = request.headers.get('cookie');

    if (cookieHeader) {
      // Parse cookies correctly - handle values that may contain '='
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach(cookie => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);
          cookies[key] = value;
        }
      });

      const sessionCookie = cookies['agendazap_session'];
      if (sessionCookie) {
        try {
          const decoded = Buffer.from(sessionCookie, 'base64').toString();
          const sessionData = JSON.parse(decoded);

          // Verify user still exists and is active
          const user = await db.user.findUnique({
            where: { id: sessionData.userId },
            include: { Account: true }
          });

          if (user && user.isActive) {
            return NextResponse.json({
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accountId: user.Account?.id || null,
              },
            });
          }
        } catch {
          // Invalid session cookie - fall through to header auth
        }
      }
    }

    // Try header-based auth (x-user-id)
    const userId = request.headers.get('x-user-id');
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { Account: true }
      });

      if (user && user.isActive) {
        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accountId: user.Account?.id || null,
          },
        });
      }
    }

    return NextResponse.json({ user: null });
  } catch {
    return NextResponse.json({ user: null });
  }
}

// Logout
export async function DELETE() {
  const cookie = serialize('agendazap_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: -1,
    path: '/',
  });

  return NextResponse.json(
    { success: true },
    { headers: { 'Set-Cookie': cookie } }
  );
}
