import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SaveMealDto } from './dto';
import { MealsService } from './meals.service';

@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(@Inject(MealsService) private readonly mealsService: MealsService) {}

  @Post()
  save(@Req() req: Request & { user: { id: string } }, @Body() dto: SaveMealDto) {
    return this.mealsService.save(req.user.id, dto);
  }

  @Get(':id')
  detail(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    return this.mealsService.getDetail(req.user.id, id);
  }
}
