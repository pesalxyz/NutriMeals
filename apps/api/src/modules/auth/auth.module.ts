import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, JwtAuthGuard, GoogleTokenVerifierService],
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthGuard]
})
export class AuthModule {}
