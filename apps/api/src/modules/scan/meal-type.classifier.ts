import { Injectable } from '@nestjs/common';
import type { MealTypeHint, VisionAnalysisResult } from '../../infra/ai/food-recognition.types';

export interface MealTypeDecision {
  mealType: MealTypeHint;
  confidence: number;
}

@Injectable()
export class MealTypeClassifier {
  classify(input: VisionAnalysisResult): MealTypeDecision {
    if (input.mealTypeHint && input.mealTypeHint !== 'unclear') {
      return { mealType: input.mealTypeHint, confidence: round2(input.overallConfidence) };
    }

    const labels = [
      ...(input.rawCandidates ?? []).map((candidate) => candidate.label.toLowerCase()),
      ...input.predictions.map((prediction) => prediction.name.toLowerCase())
    ];

    const drinkHit = labels.some((label) => ['drink', 'tea', 'coffee', 'juice', 'es teh', 'jus'].some((token) => label.includes(token)));
    if (drinkHit) return { mealType: 'drink', confidence: 0.6 };

    const mixedHit = labels.some((label) => ['padang', 'campur', 'mixed', 'plate', 'rice with'].some((token) => label.includes(token)));
    if (mixedHit || labels.length >= 3) return { mealType: 'mixed_plate', confidence: 0.62 };

    if (labels.length === 1) return { mealType: 'single_item', confidence: 0.58 };

    return { mealType: 'unclear', confidence: 0.4 };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
