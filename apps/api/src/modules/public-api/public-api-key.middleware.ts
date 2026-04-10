import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PublicApiAuthService } from './public-api-auth.service';
import type { PublicApiKeyContext } from './public-api.types';

export type PublicApiRequest = Request & { publicApiKey?: PublicApiKeyContext };

@Injectable()
export class PublicApiKeyMiddleware implements NestMiddleware {
  constructor(
    @Inject(PublicApiAuthService)
    private readonly publicApiAuthService: PublicApiAuthService
  ) {}

  async use(req: PublicApiRequest, res: Response, next: NextFunction): Promise<void> {
    const auth = await this.publicApiAuthService.validateApiKey(req.header('x-api-key'));
    if (!auth.ok || !auth.key) {
      res.status(auth.statusCode).json({ success: false, message: auth.message ?? 'Unauthorized' });
      return;
    }

    const rate = this.publicApiAuthService.checkRateLimit(auth.key.id);
    if (!rate.allowed) {
      await this.publicApiAuthService.markUsage(
        auth.key,
        429,
        req.path,
        req.method,
        0,
        'Rate limit exceeded'
      );
      if (rate.retryAfterSec) {
        res.setHeader('Retry-After', String(rate.retryAfterSec));
      }
      res.status(429).json({ success: false, message: `Rate limit exceeded. Max ${rate.limit} requests per minute.` });
      return;
    }

    req.publicApiKey = auth.key;
    next();
  }
}
