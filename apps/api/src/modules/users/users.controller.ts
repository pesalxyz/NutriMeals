import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../infra/prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@Req() req: Request & { user: { id: string } }) {
    return this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, createdAt: true }
    });
  }
}
