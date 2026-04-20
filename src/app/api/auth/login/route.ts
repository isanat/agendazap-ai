import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, revokeAllRefreshTokens } from '@/lib/jwt';

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
      } else {
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

    const sessionUser = updatedUser!;

    // Generate JWT access token
    const accessToken = await generateAccessToken({
      userId: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
      accountId: sessionUser.Account?.id || null,
    });

    // Generate refresh token
    const refreshToken = await generateRefreshToken(sessionUser.id);

    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role,
        accountId: sessionUser.Account?.id || null,
      },
    });

    // Set access token cookie (short-lived, 15 minutes)
    response.cookies.set('agendazap_session', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    // Set refresh token cookie (long-lived, 7 days)
    response.cookies.set('agendazap_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/api/auth', // Only accessible by auth routes for security
    });

    console.log('[Login] Setting JWT cookies for user:', sessionUser.email, 'isProduction:', isProduction);

    return response;
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
    // Try JWT cookie-based session first
    const cookieHeader = request.headers.get('cookie');

    if (cookieHeader) {
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
          const payload = await verifyAccessToken(sessionCookie);

          if (payload) {
            // Verify user still exists and is active
            const user = await db.user.findUnique({
              where: { id: payload.userId },
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

          // Access token expired - try refresh
          const refreshTokenValue = cookies['agendazap_refresh_token'];
          if (refreshTokenValue) {
            const result = await rotateRefreshToken(refreshTokenValue);

            if (result) {
              const isProduction = process.env.NODE_ENV === 'production';
              const newPayload = await verifyAccessToken(result.accessToken);
              if (newPayload) {
                const user = await db.user.findUnique({
                  where: { id: newPayload.userId },
                  include: { Account: true }
                });

                if (user && user.isActive) {
                  const response = NextResponse.json({
                    user: {
                      id: user.id,
                      email: user.email,
                      name: user.name,
                      role: user.role,
                      accountId: user.Account?.id || null,
                    },
                  });

                  // Set new cookies after rotation
                  response.cookies.set('agendazap_session', result.accessToken, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    maxAge: result.expiresIn,
                    path: '/',
                  });
                  response.cookies.set('agendazap_refresh_token', result.refreshToken, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 7,
                    path: '/api/auth',
                  });

                  return response;
                }
              }
            }
          }
        } catch {
          // Invalid JWT token - fall through to header auth
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
export async function DELETE(request: NextRequest) {
  // Get user ID from session to revoke refresh tokens
  try {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
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
          const payload = await verifyAccessToken(sessionCookie);
          if (payload) {
            await revokeAllRefreshTokens(payload.userId);
          }
        } catch {
          // Token may be expired
        }
      }

      // Also try to revoke via refresh token
      const refreshTokenValue = cookies['agendazap_refresh_token'];
      if (refreshTokenValue && !sessionCookie) {
        try {
          const storedToken = await db.refreshToken.findUnique({
            where: { token: refreshTokenValue }
          });
          if (storedToken) {
            await revokeAllRefreshTokens(storedToken.userId);
          }
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
  } catch (error) {
    console.error('[Logout] Error revoking tokens:', error);
  }

  const response = NextResponse.json({ success: true });

  // Clear JWT cookies
  response.cookies.set('agendazap_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: -1,
    path: '/',
  });

  response.cookies.set('agendazap_refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: -1,
    path: '/api/auth',
  });

  return response;
}

// Helper to avoid circular import - use rotateRefreshToken inline
async function rotateRefreshToken(oldRefreshToken: string) {
  const { rotateRefreshToken: rotate } = await import('@/lib/jwt');
  return rotate(oldRefreshToken);
}
