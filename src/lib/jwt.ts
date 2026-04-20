/**
 * JWT Utility - Access and Refresh Token Management
 * 
 * Features:
 * - JWT access tokens with short expiry (15 minutes)
 * - Refresh tokens with rotation (7 days)
 * - Token rotation: new refresh token issued on every refresh
 * - Old refresh tokens are revoked on rotation
 * - Cleanup of expired tokens
 */

import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

// Configuration
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.INTEGRATION_ENCRYPTION_KEY || 'agendazap-jwt-secret-key-change-in-production-32c!'
);

const REFRESH_TOKEN_SECRET = new TextEncoder().encode(
  process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'agendazap-refresh-secret-key-change-prod-32c!'
);

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  accountId: string | null;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    accountId: payload.accountId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuer('agendazap-ai')
    .setSubject(payload.userId)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT access token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'agendazap-ai',
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      accountId: payload.accountId as string | null,
    };
  } catch (error) {
    // Token expired or invalid
    return null;
  }
}

/**
 * Generate refresh token and store in database
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  // Generate a cryptographically secure random token
  const token = randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify refresh token and rotate it
 * - Returns new access token + new refresh token
 * - Revokes the old refresh token
 */
export async function rotateRefreshToken(
  oldRefreshToken: string
): Promise<RefreshTokenResult | null> {
  // Find the refresh token
  const storedToken = await db.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { User: { include: { Account: true } } },
  });

  if (!storedToken) {
    console.log('[JWT] Refresh token not found');
    return null;
  }

  // Check if token is revoked
  if (storedToken.isRevoked) {
    console.log('[JWT] Refresh token is revoked - possible token reuse attack');
    // Revoke ALL refresh tokens for this user as a security measure
    await db.refreshToken.updateMany({
      where: { userId: storedToken.userId },
      data: { isRevoked: true },
    });
    return null;
  }

  // Check if token is expired
  if (storedToken.expiresAt < new Date()) {
    console.log('[JWT] Refresh token expired');
    await db.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });
    return null;
  }

  // Check if user is still active
  if (!storedToken.User || !storedToken.User.isActive) {
    console.log('[JWT] User not active');
    return null;
  }

  // Revoke the old refresh token (rotation)
  await db.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  // Generate new access token
  const payload: TokenPayload = {
    userId: storedToken.User.id,
    email: storedToken.User.email,
    name: storedToken.User.name,
    role: storedToken.User.role,
    accountId: storedToken.User.Account?.id || null,
  };

  const accessToken = await generateAccessToken(payload);

  // Generate new refresh token (rotation)
  const newRefreshToken = await generateRefreshToken(storedToken.userId);

  // Calculate expiry in seconds
  const expiresIn = 15 * 60; // 15 minutes in seconds

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn,
  };
}

/**
 * Revoke all refresh tokens for a user (used on logout)
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

/**
 * Clean up expired refresh tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await db.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isRevoked: true, createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });

  return result.count;
}
