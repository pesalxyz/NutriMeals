import { Inject, Injectable } from '@nestjs/common';
import type { PortionUnitCode, ScanProcessResponse } from '@nutriscan/types';
import { NutritionResultFormatter } from './nutrition-result-formatter.service';
import { OpenAINutritionInferenceService } from './openai-nutrition-inference.service';
import { VisionDescriptionService } from './vision-description.service';
import { VisionScanService } from './vision-scan.service';

@Injectable()
export class ScanResultService {
  constructor(
    @Inject(VisionDescriptionService)
    private readonly visionDescriptionService: VisionDescriptionService,
    @Inject(OpenAINutritionInferenceService)
    private readonly openAINutritionInferenceService: OpenAINutritionInferenceService,
    @Inject(NutritionResultFormatter)
    private readonly nutritionResultFormatter: NutritionResultFormatter,
    @Inject(VisionScanService)
    private readonly visionScanService: VisionScanService
  ) {}

  async build(imagePath: string, imageUrl: string): Promise<{
    response: ScanProcessResponse;
    provider: string;
    mealType: ScanProcessResponse['mealType'];
    componentsForScanItems: Array<{ name: string; normalizedKey: string; confidence: number; suggestedUnit: PortionUnitCode }>;
    description: string;
    rawInference: unknown;
    normalizedResult: unknown;
  }> {
    const description = await this.visionDescriptionService.describe(imagePath, imageUrl);

    if (!description.isFood || description.confidence < 0.35) {
      return {
        provider: description.provider,
        mealType: description.mealType,
        componentsForScanItems: [],
        description: description.description,
        rawInference: null,
        normalizedResult: null,
          response: {
            status: 'no_food_detected',
            isFood: false,
          confidence: description.confidence,
          mealType: description.mealType,
          scanId: '',
          imageUrl,
          provider: description.provider,
            message: 'Gambar ini tidak terlihat mengandung makanan yang bisa dikenali.',
            description: description.description,
            notes: description.notes
          }
      };
    }

    const rawInference = await this.openAINutritionInferenceService.infer(description, imagePath);
    const formatted = this.nutritionResultFormatter.format(rawInference);

    if (formatted) {
      const lowConfidence = formatted.components.every((component) => component.confidence < 0.72);
      if (lowConfidence) {
        return {
          provider: description.provider,
          mealType: formatted.mealType,
          componentsForScanItems: formatted.components,
          description: description.description,
          rawInference,
          normalizedResult: formatted,
          response: {
            status: 'uncertain',
            isFood: true,
            confidence: description.confidence,
            mealType: formatted.mealType,
            scanId: '',
            imageUrl,
            provider: description.provider,
            message: 'AI menemukan kemungkinan komponen makanan, tetapi tingkat keyakinan masih rendah. Mohon konfirmasi sebelum menyimpan.',
            description: description.description,
            notes: dedupeNotes([formatted.summary, ...description.notes], description.description),
            uncertaintyNotes: formatted.uncertaintyNotes,
            suggestions: formatted.components,
            estimatedTotalNutrition: formatted.totalNutrition
          }
        };
      }

      return {
        provider: description.provider,
        mealType: formatted.mealType,
        componentsForScanItems: formatted.components,
        description: description.description,
        rawInference,
        normalizedResult: formatted,
        response: {
          status: 'success',
          isFood: true,
          confidence: description.confidence,
          mealType: formatted.mealType,
          scanId: '',
          imageUrl,
          provider: description.provider,
          message: 'Nutrisi diestimasi dari analisis AI terhadap deskripsi makanan.',
          description: description.description,
          notes: dedupeNotes([formatted.summary, ...description.notes], description.description),
          uncertaintyNotes: formatted.uncertaintyNotes,
          items: formatted.components,
          totalNutrition: formatted.totalNutrition
        }
      };
    }

    // Optional legacy fallback path for development only.
    if ((process.env.SCAN_LEGACY_COMPONENT_FALLBACK ?? 'false').toLowerCase() === 'true') {
      const legacy = await this.visionScanService.analyze(imagePath, imageUrl);
      return {
        provider: legacy.provider,
        mealType: legacy.mealType,
        componentsForScanItems: legacy.components,
        description: description.description,
        rawInference: null,
        normalizedResult: null,
        response: legacy.status === 'no_food_detected'
          ? {
              status: 'no_food_detected',
              isFood: false,
              confidence: legacy.confidence,
              mealType: legacy.mealType,
              scanId: '',
              imageUrl,
              provider: legacy.provider,
              message: legacy.message,
              description: description.description,
              notes: legacy.notes
            }
          : {
              status: 'uncertain',
              isFood: true,
              confidence: legacy.confidence,
              mealType: legacy.mealType,
              scanId: '',
              imageUrl,
              provider: legacy.provider,
              message: 'Inferensi nutrisi AI belum lengkap. Menampilkan saran cadangan untuk konfirmasi manual.',
              description: description.description,
              notes: legacy.notes,
              suggestions: legacy.components
            }
      };
    }

    return {
      provider: description.provider,
      mealType: description.mealType,
      componentsForScanItems: [],
      description: description.description,
      rawInference: rawInference ?? null,
      normalizedResult: null,
      response: {
        status: 'uncertain',
        isFood: true,
        confidence: description.confidence,
        mealType: description.mealType,
        scanId: '',
        imageUrl,
        provider: description.provider,
        message: 'Kami belum bisa menghasilkan estimasi nutrisi yang andal dari gambar ini. Silakan coba ulang atau tambahkan item secara manual.',
        description: description.description,
        notes: description.notes,
        suggestions: []
      }
    };
  }
}

function dedupeNotes(notes: string[], description: string): string[] {
  const out: string[] = [];
  const descLower = description.toLowerCase().trim();
  for (const note of notes) {
    const clean = note?.trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (descLower && (lower === descLower || descLower.includes(lower) || lower.includes(descLower))) continue;
    const exists = out.some((entry) => {
      const value = entry.toLowerCase();
      return value === lower || value.includes(lower) || lower.includes(value);
    });
    if (!exists) out.push(clean);
  }
  return out.slice(0, 6);
}
