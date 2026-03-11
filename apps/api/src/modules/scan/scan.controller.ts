import { BadRequestException, Body, Controller, Inject, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StorageService } from '../../infra/storage/storage.service';
import { EstimateScanDto, ProcessScanDto } from './dto';
import { NutritionEstimationService } from './nutrition-estimation.service';
import { ScanService } from './scan.service';

@UseGuards(JwtAuthGuard)
@Controller('scan')
export class ScanController {
  constructor(
    @Inject(ScanService)
    private readonly scanService: ScanService,
    @Inject(StorageService)
    private readonly storageService: StorageService,
    @Inject(NutritionEstimationService)
    private readonly nutritionEstimationService: NutritionEstimationService
  ) {}

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@Req() req: Request & { user: { id: string } }, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');
    const stored = await this.storageService.saveImage(file);
    const scan = await this.scanService.createUploadRecord(req.user.id, stored.imageUrl);
    return { scanId: scan.id, imageUrl: stored.imageUrl };
  }

  @Post('process')
  process(@Req() req: Request & { user: { id: string } }, @Body() dto: ProcessScanDto) {
    return this.scanService.process(req.user.id, dto);
  }

  @Post('estimate')
  estimate(@Body() dto: EstimateScanDto) {
    return this.nutritionEstimationService.estimate(dto);
  }
}
