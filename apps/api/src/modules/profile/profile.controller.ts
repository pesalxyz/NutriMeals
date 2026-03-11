import { Body, Controller, Get, Inject, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpsertProfileDto } from './dto';
import { ProfileService } from './profile.service';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(@Inject(ProfileService) private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Req() req: Request & { user: { id: string } }) {
    return this.profileService.get(req.user.id);
  }

  @Put()
  upsertProfile(@Req() req: Request & { user: { id: string } }, @Body() dto: UpsertProfileDto) {
    return this.profileService.upsert(req.user.id, dto);
  }
}
