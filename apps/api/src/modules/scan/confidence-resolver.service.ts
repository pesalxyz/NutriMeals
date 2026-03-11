import { Injectable } from '@nestjs/common';
import type { MealTypeHint } from '../../infra/ai/food-recognition.types';
import type { FoodPrediction } from '@nutriscan/types';

export interface ConfidenceResolution {
  status: 'success' | 'uncertain' | 'no_food_detected';
  confidence: number;
  message: string;
}

@Injectable()
export class ConfidenceResolver {
  resolve(input: {
    isFood: boolean;
    foodConfidence: number;
    mealType: MealTypeHint;
    mealTypeConfidence: number;
    components: FoodPrediction[];
    hasLocalizedEvidence: boolean;
    containsOnlyGenericFastFood: boolean;
    topComponentConfidence: number;
  }): ConfidenceResolution {
    const blended = round2(input.foodConfidence * 0.7 + input.mealTypeConfidence * 0.3);

    if (!input.isFood || blended < 0.35 || input.components.length === 0) {
      return {
        status: 'no_food_detected',
        confidence: blended,
        message: 'This image does not appear to contain recognizable food.'
      };
    }

    if (input.containsOnlyGenericFastFood) {
      if (input.mealType === 'mixed_plate' || input.topComponentConfidence < 0.88) {
        return {
          status: 'uncertain',
          confidence: blended,
          message: 'Detected labels are generic and may be incorrect for this meal. Please confirm items manually.'
        };
      }
    }

    if (!input.hasLocalizedEvidence && input.mealType !== 'drink' && blended < 0.82) {
      return {
        status: 'uncertain',
        confidence: blended,
        message: 'We found possible food labels, but meal components are still ambiguous. Please confirm manually.'
      };
    }

    if (blended < 0.7 || input.mealType === 'unclear' || (input.mealType === 'mixed_plate' && input.components.length < 2)) {
      return {
        status: 'uncertain',
        confidence: blended,
        message: 'Mixed meal detected with low confidence. Please confirm detected components before nutrition is finalized.'
      };
    }

    return {
      status: 'success',
      confidence: blended,
      message: 'Mixed meal detected. Nutrition is estimated from visible components.'
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
