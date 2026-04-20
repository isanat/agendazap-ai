import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock jwt module
vi.mock('@/lib/jwt', () => ({
  verifyAccessToken: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
  revokeAllRefreshTokens: vi.fn(),
}));

import { getAuthUser, isSuperAdmin, hasAccountAccess } from '../auth-helpers';
import { db } from '@/lib/db';
import { verifyAccessToken } from '../jwt';

describe('Auth Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthUser', () => {
    it('should return null when no cookies or headers present', async () => {
      const request = new Request('http://localhost/api/test') as any;
      const result = await getAuthUser(request);
      expect(result).toBeNull();
    });

    it('should verify user from JWT cookie', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        userId: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'owner',
        accountId: 'acc-1',
      });

      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'owner',
        isActive: true,
        Account: { id: 'acc-1' },
      } as any);

      const request = {
        headers: {
          get: (key: string) => {
            if (key === 'cookie') return 'agendazap_session=mock-token';
            return null;
          },
        },
      } as any;

      const result = await getAuthUser(request);
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@test.com');
    });

    it('should return null for inactive user', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        userId: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'owner',
        accountId: 'acc-1',
      });

      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@test.com',
        isActive: false,
      } as any);

      const request = {
        headers: {
          get: (key: string) => {
            if (key === 'cookie') return 'agendazap_session=mock-token';
            return null;
          },
        },
      } as any;

      const result = await getAuthUser(request);
      expect(result).toBeNull();
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true for superadmin user', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        userId: 'admin-1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'superadmin',
        accountId: null,
      });

      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'admin-1',
        isActive: true,
        role: 'superadmin',
        Account: null,
      } as any);

      const request = {
        headers: {
          get: (key: string) => {
            if (key === 'cookie') return 'agendazap_session=mock-token';
            return null;
          },
        },
      } as any;

      const result = await isSuperAdmin(request);
      expect(result).toBe(true);
    });
  });

  describe('hasAccountAccess', () => {
    it('should allow superadmin access to any account', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        userId: 'admin-1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'superadmin',
        accountId: null,
      });

      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'admin-1',
        isActive: true,
        role: 'superadmin',
        Account: null,
      } as any);

      const request = {
        headers: {
          get: (key: string) => {
            if (key === 'cookie') return 'agendazap_session=mock-token';
            return null;
          },
        },
      } as any;

      const result = await hasAccountAccess(request, 'any-account-id');
      expect(result).toBe(true);
    });
  });
});
