import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthService', () => {
  it('accepts any verified Google account and returns JWT', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'u1', email: 'user@gmail.com' }),
        update: vi.fn()
      }
    } as any;

    const jwtService = {
      sign: vi.fn().mockReturnValue('token-123')
    } as any;
    const googleVerifier = {
      verify: vi.fn().mockResolvedValue({
        sub: 'google-sub',
        email: 'user@gmail.com',
        emailVerified: true
      })
    } as any;

    const service = new AuthService(prisma, jwtService, googleVerifier);

    const result = await service.loginWithGoogle({ idToken: 'id-token' });

    expect(result.accessToken).toBe('token-123');
    expect(prisma.user.upsert).toHaveBeenCalled();
  });

  it('rejects unverified Google account', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn()
      }
    } as any;
    const jwtService = { sign: vi.fn() } as any;
    const googleVerifier = {
      verify: vi.fn().mockResolvedValue({
        sub: 'google-sub',
        email: 'user@gmail.com',
        emailVerified: false
      })
    } as any;

    const service = new AuthService(prisma, jwtService, googleVerifier);

    await expect(service.loginWithGoogle({ idToken: 'id-token' })).rejects.toThrow('Akun Google belum terverifikasi email.');
  });
});
