import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { StorageModule } from '../../infra/storage/storage.module';
import { ScanModule } from '../scan/scan.module';
import { PublicApiAuthService } from './public-api-auth.service';
import { PublicApiController } from './public-api.controller';
import { PublicApiKeyMiddleware } from './public-api-key.middleware';

@Module({
  imports: [PrismaModule, StorageModule, ScanModule],
  controllers: [PublicApiController],
  providers: [PublicApiAuthService]
})
export class PublicApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(PublicApiKeyMiddleware)
      .forRoutes({ path: 'api/public/v1/analyze-food', method: RequestMethod.POST });
  }
}
