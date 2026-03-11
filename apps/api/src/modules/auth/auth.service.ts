import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { GoogleAuthDto } from './dto';
import { GoogleTokenVerifierService } from './google-token-verifier.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(GoogleTokenVerifierService)
    private readonly googleTokenVerifierService: GoogleTokenVerifierService
  ) {}

  async loginWithGoogle(dto: GoogleAuthDto) {
    const identity = await this.googleTokenVerifierService.verify(dto.idToken);

    if (!identity.emailVerified) {
      throw new UnauthorizedException('Akun Google belum terverifikasi email.');
    }

    const existingByGoogleSub = await this.prisma.user.findUnique({
      where: { googleSub: identity.sub }
    });

    const user = existingByGoogleSub
      ? await this.prisma.user.update({
          where: { id: existingByGoogleSub.id },
          data: { email: identity.email, googleSub: identity.sub }
        })
      : await this.prisma.user.upsert({
          where: { email: identity.email },
          update: { googleSub: identity.sub },
          create: {
            email: identity.email,
            googleSub: identity.sub,
            passwordHash: null
          }
        });

    return this.issueToken(user.id, user.email);
  }

  rejectLegacyAuth() {
    throw new BadRequestException('Login password dinonaktifkan. Lanjutkan dengan akun Google.');
  }

  private issueToken(userId: string, email: string) {
    const jwtSecret = process.env.JWT_SECRET?.trim() || 'change_me';
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      { secret: jwtSecret, expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' }
    );

    return {
      accessToken,
      user: { id: userId, email }
    };
  }
}
