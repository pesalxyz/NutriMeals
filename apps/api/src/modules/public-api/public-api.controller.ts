import { BadRequestException, Controller, Inject, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Response } from 'express';
import type { ScanProcessResponse } from '@nutriscan/types';
import { StorageService } from '../../infra/storage/storage.service';
import { ScanResultService } from '../scan/scan-result.service';
import { PublicApiAuthService } from './public-api-auth.service';
import type { PublicApiRequest } from './public-api-key.middleware';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('api/public/v1')
export class PublicApiController {
  constructor(
    @Inject(StorageService)
    private readonly storageService: StorageService,
    @Inject(ScanResultService)
    private readonly scanResultService: ScanResultService,
    @Inject(PublicApiAuthService)
    private readonly publicApiAuthService: PublicApiAuthService
  ) {}

  @Post('analyze-food')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES }
    })
  )
  async analyzeFood(@Req() req: PublicApiRequest, @Res() res: Response, @UploadedFile() file: Express.Multer.File) {
    const startedAt = Date.now();
    const requestId = randomUUID();

    const apiKey = req.publicApiKey;
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      this.validateImageFile(file);

      const saved = await this.storageService.saveImage(file);
      const built = await this.scanResultService.build(saved.absolutePath, saved.imageUrl);

      if (built.response.status === 'no_food_detected') {
        return res.status(200).json({
          success: false,
          message: built.response.message,
          data: null,
          meta: {
            request_id: requestId,
            processed_at: new Date().toISOString()
          }
        });
      }

      if (built.response.status === 'uncertain') {
        return res.status(200).json({
          success: true,
          message: built.response.message,
          data: toUncertainPublicPayload(built.response),
          meta: {
            request_id: requestId,
            processed_at: new Date().toISOString()
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Food analysis completed successfully',
        data: toSuccessPublicPayload(built.response),
        meta: {
          request_id: requestId,
          processed_at: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        statusCode = 400;
        const response = error.getResponse();
        errorMessage = typeof response === 'object' && response !== null && 'message' in response
          ? String((response as { message: string }).message)
          : 'Bad request';

        return res.status(statusCode).json({
          success: false,
          message: errorMessage
        });
      }

      statusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Internal server error';
      return res.status(statusCode).json({
        success: false,
        message: 'Failed to analyze food image'
      });
    } finally {
      await this.publicApiAuthService.markUsage(
        apiKey,
        statusCode,
        req.path,
        req.method,
        Date.now() - startedAt,
        errorMessage
      );
    }
  }

  private validateImageFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image file exceeds the maximum size of 5MB');
    }

    const extension = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only jpg, jpeg, png, and webp images are allowed');
    }

    if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Only jpg, jpeg, png, and webp images are allowed');
    }
  }
}

function toSuccessPublicPayload(response: Extract<ScanProcessResponse, { status: 'success' }>) {
  const primary = response.items[0];
  const firstPortion = primary
    ? `${primary.suggestedQuantity ?? 1} ${primary.suggestedUnit}`
    : '1 portion';

  return {
    food_name: primary?.name ?? 'mixed meal',
    estimated_portion: firstPortion,
    estimated_calories: roundValue(response.totalNutrition.calories),
    protein_g: roundValue(response.totalNutrition.protein),
    carbs_g: roundValue(response.totalNutrition.carbs),
    fat_g: roundValue(response.totalNutrition.fat),
    confidence: roundValue(response.confidence, 2),
    notes: [
      'Hasil merupakan estimasi berbasis analisis visual AI.',
      ...response.notes
    ],
    meal_type: response.mealType,
    components: response.items.map((item) => ({
      name: item.name,
      confidence: roundValue(item.confidence, 2),
      suggested_portion: `${item.suggestedQuantity ?? 1} ${item.suggestedUnit}`,
      estimated_weight_grams: roundValue(item.estimatedWeightGrams ?? 0),
      nutrition: {
        calories: roundValue(item.nutrition.calories),
        protein_g: roundValue(item.nutrition.protein),
        carbs_g: roundValue(item.nutrition.carbs),
        fat_g: roundValue(item.nutrition.fat),
        sugar_g: roundValue(item.nutrition.sugar),
        fiber_g: roundValue(item.nutrition.fiber),
        sodium_mg: roundValue(item.nutrition.sodium)
      }
    })),
    total_nutrition: {
      calories: roundValue(response.totalNutrition.calories),
      protein_g: roundValue(response.totalNutrition.protein),
      carbs_g: roundValue(response.totalNutrition.carbs),
      fat_g: roundValue(response.totalNutrition.fat),
      sugar_g: roundValue(response.totalNutrition.sugar),
      fiber_g: roundValue(response.totalNutrition.fiber),
      sodium_mg: roundValue(response.totalNutrition.sodium)
    }
  };
}

function toUncertainPublicPayload(response: Extract<ScanProcessResponse, { status: 'uncertain' }>) {
  return {
    food_name: 'uncertain',
    estimated_portion: 'unknown',
    estimated_calories: response.estimatedTotalNutrition ? roundValue(response.estimatedTotalNutrition.calories) : null,
    protein_g: response.estimatedTotalNutrition ? roundValue(response.estimatedTotalNutrition.protein) : null,
    carbs_g: response.estimatedTotalNutrition ? roundValue(response.estimatedTotalNutrition.carbs) : null,
    fat_g: response.estimatedTotalNutrition ? roundValue(response.estimatedTotalNutrition.fat) : null,
    confidence: roundValue(response.confidence, 2),
    notes: [
      'AI confidence masih rendah, mohon konfirmasi manual sebelum menyimpan.',
      ...response.notes
    ],
    meal_type: response.mealType,
    suggestions: response.suggestions.map((item) => ({
      name: item.name,
      confidence: roundValue(item.confidence, 2),
      suggested_portion: `${item.suggestedQuantity ?? 1} ${item.suggestedUnit}`,
      estimated_weight_grams: roundValue(item.estimatedWeightGrams ?? 0)
    }))
  };
}

function roundValue(value: number, digits = 1): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
