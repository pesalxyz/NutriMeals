import { Inject, Injectable } from '@nestjs/common';
import type { MealTypeHint, VisionAnalysisResult } from '../../infra/ai/food-recognition.types';
import { FoodRecognitionService } from '../../infra/ai/food-recognition.service';
import { FoodVsNonFoodClassifier } from './food-vs-non-food.classifier';
import { MealTypeClassifier } from './meal-type.classifier';

export interface VisionDescriptionResult {
  provider: string;
  isFood: boolean;
  confidence: number;
  mealType: MealTypeHint;
  description: string;
  notes: string[];
  analysis: VisionAnalysisResult;
}

@Injectable()
export class VisionDescriptionService {
  constructor(
    @Inject(FoodRecognitionService)
    private readonly foodRecognitionService: FoodRecognitionService,
    @Inject(FoodVsNonFoodClassifier)
    private readonly foodVsNonFoodClassifier: FoodVsNonFoodClassifier,
    @Inject(MealTypeClassifier)
    private readonly mealTypeClassifier: MealTypeClassifier
  ) {}

  async describe(imagePath: string, imageUrl: string): Promise<VisionDescriptionResult> {
    const { provider, analysis } = await this.foodRecognitionService.analyze(imagePath, imageUrl);
    const foodDecision = this.foodVsNonFoodClassifier.classify(analysis);
    const mealTypeDecision = this.mealTypeClassifier.classify(analysis);

    const labels = [
      ...(analysis.rawCandidates ?? []).map((candidate) => candidate.label.trim()),
      ...analysis.predictions.map((prediction) => prediction.name.trim())
    ].filter(Boolean);

    const labelsSummary = dedupe(labels).slice(0, 8).join(', ');
    const reason = analysis.reason?.trim() ?? '';
    const candidateLine = labelsSummary ? `Kandidat terlihat: ${labelsSummary}.` : '';
    const description = dedupe([reason, candidateLine]).join(' ');

    const notes = dedupe([
      foodDecision.reason,
      analysis.reason ?? '',
      mealTypeDecision.mealType === 'mixed_plate' ? 'Makanan campur terdeteksi dari analisis gambar.' : ''
    ]);

    return {
      provider,
      isFood: foodDecision.isFood,
      confidence: foodDecision.confidence,
      mealType: mealTypeDecision.mealType,
      description: description || 'Analisis gambar makanan selesai.',
      notes,
      analysis
    };
  }
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
