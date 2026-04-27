import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module - must be before any imports that use it
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { verifyAccessToken, rotateRefreshToken, revokeAllRefreshTokens, cleanupExpiredTokens } from '../jwt';
import { db } from '@/lib/db';

describe('JWT Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyAccessToken', () => {
    it('should return null for invalid/expired token', async () => {
      // An invalid token string will fail JWT verification
      const payload = await verifyAccessToken('invalid-token-string');
      expect(payload).toBeNull();
    });

    it('should return null for empty token', async () => {
      const payload = await verifyAccessToken('');
      expect(payload).toBeNull();
    });

    it('should return null for malformed JWT', async () => {
      const payload = await verifyAccessToken('not.a.valid-jwt');
      expect(payload).toBeNull();
    });
  });

  describe('rotateRefreshToken', () => {
    it('should return null for non-existent refresh token', async () => {
      vi.mocked(db.refreshToken.findUnique).mockResolvedValueOnce(null as any);

      const result = await rotateRefreshToken('non-existent-token');
      expect(result).toBeNull();
    });

    it('should return null for revoked token and revoke all user tokens', async () => {
      vi.mocked(db.refreshToken.findUnique).mockResolvedValueOnce({
        id: 'rt-1',
        token: 'revoked-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: true,
        createdAt: new Date(),
        User: { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'owner', isActive: true, Account: { id: 'acc-1' } },
      } as any);

      const result = await rotateRefreshToken('revoked-token');
      expect(result).toBeNull();
      expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isRevoked: true },
      });
    });

    it('should return null for expired token and revoke it', async () => {
      vi.mocked(db.refreshToken.findUnique).mockResolvedValueOnce({
        id: 'rt-1',
        token: 'expired-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        isRevoked: false,
        createdAt: new Date(),
        User: { id: 'user-1', isActive: true },
      } as any);

      const result = await rotateRefreshToken('expired-token');
      expect(result).toBeNull();
      expect(db.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('should return null for inactive user', async () => {
      vi.mocked(db.refreshToken.findUnique).mockResolvedValueOnce({
        id: 'rt-1',
        token: 'valid-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: false,
        createdAt: new Date(),
        User: { id: 'user-1', isActive: false },
      } as any);

      const result = await rotateRefreshToken('valid-token');
      expect(result).toBeNull();
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('should revoke all non-revoked tokens for a user', async () => {
      await revokeAllRefreshTokens('user-1');
      expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired and old revoked tokens', async () => {
      vi.mocked(db.refreshToken.deleteMany).mockResolvedValueOnce({ count: 5 } as any);

      const count = await cleanupExpiredTokens();
      expect(count).toBe(5);
      expect(db.refreshToken.deleteMany).toHaveBeenCalled();
    });
  });
});
