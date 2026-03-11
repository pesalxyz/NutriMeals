import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HistoryService } from './history.service';

@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(@Inject(HistoryService) private readonly historyService: HistoryService) {}

  @Get()
  list(@Req() req: Request & { user: { id: string } }, @Query('date') date?: string) {
    return this.historyService.list(req.user.id, date);
  }
}
