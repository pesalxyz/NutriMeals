import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { hashApiKey, safeEqual } from '../../common/utils/api-key.util';
import type { PublicApiAuthResult, PublicApiKeyContext } from './public-api.types';

@Injectable()
export class PublicApiAuthService {
  private readonly windowMs = 60_000;
  private readonly buckets = new Map<string, number[]>();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async validateApiKey(rawApiKey: string | undefined): Promise<PublicApiAuthResult> {
    if (!rawApiKey) {
      return { ok: false, statusCode: 401, message: 'API key is required' };
    }

    const keyParts = rawApiKey.split('_');
    if (keyParts.length < 3) {
      return { ok: false, statusCode: 401, message: 'Invalid API key' };
    }

    const keyPrefix = keyParts.slice(0, 2).join('_');
    const apiKey = await this.prisma.apiKey.findUnique({ where: { keyPrefix } });

    if (!apiKey) {
      return { ok: false, statusCode: 401, message: 'Invalid API key' };
    }

    const hashedIncoming = hashApiKey(rawApiKey);
    if (!safeEqual(apiKey.keyHash, hashedIncoming)) {
      return { ok: false, statusCode: 401, message: 'Invalid API key' };
    }

    if (apiKey.status !== 'active') {
      return { ok: false, statusCode: 403, message: 'API key is inactive' };
    }

    return {
      ok: true,
      statusCode: 200,
      key: {
        id: apiKey.id,
        ownerId: apiKey.ownerId,
        name: apiKey.name,
        status: apiKey.status
      }
    };
  }

  checkRateLimit(apiKeyId: string): { allowed: boolean; retryAfterSec?: number; limit: number } {
    const now = Date.now();
    const limitPerMinute = Number(process.env.PUBLIC_API_RATE_LIMIT_PER_MINUTE ?? 10);
    const safeLimit = Number.isFinite(limitPerMinute) && limitPerMinute > 0 ? Math.floor(limitPerMinute) : 10;

    const timestamps = this.buckets.get(apiKeyId) ?? [];
    const inWindow = timestamps.filter((ts) => now - ts < this.windowMs);

    if (inWindow.length >= safeLimit) {
      const oldest = inWindow[0];
      const retryAfterMs = Math.max(1_000, this.windowMs - (now - oldest));
      this.buckets.set(apiKeyId, inWindow);
      return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000), limit: safeLimit };
    }

    inWindow.push(now);
    this.buckets.set(apiKeyId, inWindow);
    return { allowed: true, limit: safeLimit };
  }

  async markUsage(apiKey: PublicApiKeyContext, statusCode: number, endpoint: string, method: string, durationMs: number, errorMessage?: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        }),
        this.prisma.apiUsageLog.create({
          data: {
            apiKeyId: apiKey.id,
            endpoint,
            method,
            statusCode,
            durationMs,
            errorMessage: errorMessage?.slice(0, 250)
          }
        })
      ]);
    } catch (error) {
      console.error('[PublicApiUsageLogError]', error);
    }
  }
}
