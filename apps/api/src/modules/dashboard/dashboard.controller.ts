import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get('daily-summary')
  dailySummary(@Req() req: Request & { user: { id: string } }, @Query('date') date?: string) {
    return this.dashboardService.dailySummary(req.user.id, date);
  }

  @Get('recent-scans')
  recentScans(@Req() req: Request & { user: { id: string } }) {
    return this.dashboardService.recent(req.user.id);
  }
}
