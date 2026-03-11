import { Injectable } from '@nestjs/common';
import type { FoodPrediction } from '@nutriscan/types';
import type { FoodRecognitionProvider, VisionAnalysisResult } from './food-recognition.types';

@Injectable()
export class MockFoodRecognitionProvider implements FoodRecognitionProvider {
  name = 'mock_fixed';

  async analyze(_imagePath: string, _imageUrl: string): Promise<VisionAnalysisResult> {
    const predictions: FoodPrediction[] = [
      { name: 'Nasi Goreng', normalizedKey: 'nasi_goreng', confidence: 0.82, suggestedUnit: 'plate' },
      { name: 'Ayam Goreng', normalizedKey: 'ayam_goreng', confidence: 0.71, suggestedUnit: 'piece' }
    ];

    return {
      isFoodCandidate: true,
      overallConfidence: 0.82,
      predictions,
      reason: 'Fixed mock provider for explicit development/demo mode only.'
    };
  }
}
