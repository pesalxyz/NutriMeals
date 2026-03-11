import { Injectable } from '@nestjs/common';
import type { VisionAnalysisResult } from '../../infra/ai/food-recognition.types';

export interface FoodVsNonFoodDecision {
  isFood: boolean;
  confidence: number;
  reason: string;
}

@Injectable()
export class FoodVsNonFoodClassifier {
  classify(input: VisionAnalysisResult): FoodVsNonFoodDecision {
    const confidence = round2(input.overallConfidence ?? 0);

    if (!input.isFoodCandidate || confidence < 0.35) {
      return {
        isFood: false,
        confidence,
        reason: input.reason ?? 'Image appears to be non-food or too unclear.'
      };
    }

    return {
      isFood: true,
      confidence,
      reason: input.reason ?? 'Food candidate detected.'
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
