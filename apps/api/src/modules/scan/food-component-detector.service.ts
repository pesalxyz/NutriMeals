import { Injectable } from '@nestjs/common';
import type { FoodPrediction } from '@nutriscan/types';
import type { MealTypeHint } from '../../infra/ai/food-recognition.types';
import type { NormalizedFoodCandidate } from './food-label-normalizer.service';

@Injectable()
export class FoodComponentDetector {
  detect(mealType: MealTypeHint, candidates: NormalizedFoodCandidate[]): FoodPrediction[] {
    if (!candidates.length) return [];

    const scored = candidates
      .map((candidate) => ({ ...candidate, confidence: this.applyRegionalBias(mealType, candidate) }))
      .filter((candidate) => candidate.confidence >= 0.35)
      .sort((a, b) => b.confidence - a.confidence);

    if (!scored.length) return [];

    if (mealType === 'mixed_plate') {
      const preferredCategories: Array<NormalizedFoodCandidate['category']> = ['rice', 'protein', 'egg', 'sambal', 'vegetable', 'sauce', 'side'];
      const selected: NormalizedFoodCandidate[] = [];

      for (const category of preferredCategories) {
        const candidate = scored.find((item) => item.category === category && !selected.some((existing) => existing.normalizedKey === item.normalizedKey));
        if (candidate) selected.push(candidate);
      }

      return selected.slice(0, 6).map((item) => toPrediction(item));
    }

    return scored.slice(0, 3).map((item) => toPrediction(item));
  }

  private applyRegionalBias(mealType: MealTypeHint, candidate: NormalizedFoodCandidate): number {
    let confidence = candidate.confidence;

    // Avoid western-fast-food hallucination for mixed Indonesian meal contexts.
    if (['burger', 'pizza'].includes(candidate.normalizedKey)) {
      if (mealType === 'mixed_plate') {
        confidence -= 0.55;
      } else if (mealType === 'unclear') {
        confidence -= 0.4;
      } else if (mealType === 'single_item' && confidence < 0.88) {
        confidence -= 0.3;
      }
    }

    if (mealType === 'mixed_plate' && ['rice', 'protein', 'egg', 'sambal', 'vegetable', 'sauce'].includes(candidate.category)) {
      confidence += 0.08;
    }

    return Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));
  }
}

function toPrediction(candidate: NormalizedFoodCandidate): FoodPrediction {
  return {
    name: candidate.displayName,
    normalizedKey: candidate.normalizedKey,
    confidence: candidate.confidence,
    suggestedUnit: candidate.suggestedUnit,
    category: candidate.category
  };
}
