import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScanStatus } from '@prisma/client';
import type { ScanProcessResponse } from '@nutriscan/types';
import { basename, join } from 'node:path';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProcessScanDto } from './dto';
import { ScanResultService } from './scan-result.service';

@Injectable()
export class ScanService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ScanResultService)
    private readonly scanResultService: ScanResultService
  ) {}

  async createUploadRecord(userId: string, imageUrl: string, provider = 'pending') {
    return this.prisma.scan.create({
      data: { userId, imageUrl, recognitionProvider: provider }
    });
  }

  async process(userId: string, dto: ProcessScanDto): Promise<ScanProcessResponse> {
    const imagePath = resolveLocalImagePath(dto.imageUrl);
    const built = await this.scanResultService.build(imagePath, dto.imageUrl);

    const existingScan = dto.scanId ? await this.prisma.scan.findFirst({ where: { id: dto.scanId, userId } }) : null;
    const scan = existingScan
      ? await this.prisma.scan.update({
          where: { id: existingScan.id },
          data: {
            imageUrl: dto.imageUrl,
            recognitionProvider: built.provider,
            status: ScanStatus.processed,
            visionDescription: built.description,
            nutritionInference: built.rawInference as any,
            nutritionResult: built.normalizedResult as any,
            items: {
              deleteMany: {},
              create: built.componentsForScanItems.map((prediction) => ({
                predictedName: prediction.name,
                normalizedKey: prediction.normalizedKey,
                confidence: prediction.confidence,
                suggestedUnit: prediction.suggestedUnit,
                bboxX: null,
                bboxY: null,
                bboxWidth: null,
                bboxHeight: null
              }))
            }
          }
        })
      : await this.prisma.scan.create({
          data: {
            userId,
            imageUrl: dto.imageUrl,
            recognitionProvider: built.provider,
            status: ScanStatus.processed,
            visionDescription: built.description,
            nutritionInference: built.rawInference as any,
            nutritionResult: built.normalizedResult as any,
            items: {
              create: built.componentsForScanItems.map((prediction) => ({
                predictedName: prediction.name,
                normalizedKey: prediction.normalizedKey,
                confidence: prediction.confidence,
                suggestedUnit: prediction.suggestedUnit,
                bboxX: null,
                bboxY: null,
                bboxWidth: null,
                bboxHeight: null
              }))
            }
          }
        });

    if (built.response.status === 'no_food_detected') {
      return {
        ...built.response,
        scanId: scan.id,
        imageUrl: scan.imageUrl
      };
    }

    if (built.response.status === 'uncertain') {
      return {
        ...built.response,
        scanId: scan.id,
        imageUrl: scan.imageUrl
      };
    }

    return {
      ...built.response,
      scanId: scan.id,
      imageUrl: scan.imageUrl
    };
  }

  async getScanOrThrow(scanId: string) {
    const scan = await this.prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }
}

function resolveLocalImagePath(imageUrl: string): string {
  const baseDir = process.env.LOCAL_UPLOAD_DIR ?? 'apps/api/uploads';
  return join(baseDir, basename(imageUrl));
}
