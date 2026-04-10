import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateDeveloperKeyDto, UpdateDeveloperKeyStatusDto } from './dto';
import { DeveloperKeysService } from './developer-keys.service';

@UseGuards(JwtAuthGuard)
@Controller('api/developer/keys')
export class DeveloperKeysController {
  constructor(
    @Inject(DeveloperKeysService)
    private readonly developerKeysService: DeveloperKeysService
  ) {}

  @Post()
  create(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateDeveloperKeyDto) {
    return this.developerKeysService.create(req.user.id, dto.name);
  }

  @Get()
  list(@Req() req: Request & { user: { id: string } }) {
    return this.developerKeysService.list(req.user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateDeveloperKeyStatusDto
  ) {
    const status = dto.status ?? 'active';
    const updated = await this.developerKeysService.updateStatus(req.user.id, id, status);
    return {
      id: updated.id,
      status: updated.status
    };
  }
}
