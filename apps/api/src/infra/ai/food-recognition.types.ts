import type { FoodPrediction } from '@nutriscan/types';

export type MealTypeHint = 'single_item' | 'mixed_plate' | 'packaged_food' | 'drink' | 'unclear';

export interface VisionLabelCandidate {
  label: string;
  confidence: number;
}

export interface VisionAnalysisResult {
  isFoodCandidate: boolean;
  overallConfidence: number;
  predictions: FoodPrediction[];
  rawCandidates?: VisionLabelCandidate[];
  mealTypeHint?: MealTypeHint;
  reason?: string;
  rawMeta?: unknown;
}

export interface FoodRecognitionProvider {
  name: string;
  analyze(imagePath: string, imageUrl: string): Promise<VisionAnalysisResult>;
}
