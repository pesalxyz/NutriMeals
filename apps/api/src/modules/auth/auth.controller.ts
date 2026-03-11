import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  register() {
    return this.authService.rejectLegacyAuth();
  }

  @Post('login')
  login() {
    return this.authService.rejectLegacyAuth();
  }

  @Post('google')
  google(@Body() dto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(dto);
  }

  @Post('logout')
  logout() {
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: { id: string; email: string } }) {
    return req.user;
  }
}
