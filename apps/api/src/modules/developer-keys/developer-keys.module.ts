import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DeveloperKeysController } from './developer-keys.controller';
import { DeveloperKeysService } from './developer-keys.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DeveloperKeysController],
  providers: [DeveloperKeysService]
})
export class DeveloperKeysModule {}
