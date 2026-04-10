import { describe, expect, it, vi } from 'vitest';
import { generatePublicApiKey, hashApiKey } from '../src/common/utils/api-key.util';
import { PublicApiAuthService } from '../src/modules/public-api/public-api-auth.service';

describe('Public API auth', () => {
  it('generates key and hash deterministically', () => {
    const generated = generatePublicApiKey();

    expect(generated.plainKey.startsWith('nm_live_')).toBe(true);
    expect(generated.keyPrefix.startsWith('nm_live_')).toBe(true);
    expect(generated.keyHash).toBe(hashApiKey(generated.plainKey));
  });

  it('validates an active key', async () => {
    const generated = generatePublicApiKey();
    const prisma = {
      apiKey: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'k1',
          ownerId: 'u1',
          name: 'demo',
          keyHash: generated.keyHash,
          status: 'active'
        })
      }
    } as any;

    const service = new PublicApiAuthService(prisma);
    const result = await service.validateApiKey(generated.plainKey);

    expect(result.ok).toBe(true);
    expect(result.key?.id).toBe('k1');
  });

  it('validates key when secret contains underscore', async () => {
    const plainKey = 'nm_live_ab12cd34ef56_part_one_part_two';
    const prisma = {
      apiKey: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'k2',
          ownerId: 'u1',
          name: 'demo-2',
          keyHash: hashApiKey(plainKey),
          status: 'active'
        })
      }
    } as any;

    const service = new PublicApiAuthService(prisma);
    const result = await service.validateApiKey(plainKey);

    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({ where: { keyPrefix: 'nm_live_ab12cd34ef56' } });
    expect(result.ok).toBe(true);
    expect(result.key?.id).toBe('k2');
  });

  it('blocks request when rate limit is exceeded', () => {
    process.env.PUBLIC_API_RATE_LIMIT_PER_MINUTE = '2';

    const prisma = {
      apiKey: {
        findUnique: vi.fn()
      }
    } as any;

    const service = new PublicApiAuthService(prisma);
    expect(service.checkRateLimit('k1').allowed).toBe(true);
    expect(service.checkRateLimit('k1').allowed).toBe(true);
    expect(service.checkRateLimit('k1').allowed).toBe(false);
  });
});
