import { Inject, Injectable } from '@nestjs/common';
import type { FoodPrediction } from '@nutriscan/types';
import { FoodRecognitionService } from '../../infra/ai/food-recognition.service';
import { ConfidenceResolver } from './confidence-resolver.service';
import { FoodComponentDetector } from './food-component-detector.service';
import { FoodLabelNormalizer } from './food-label-normalizer.service';
import { FoodVsNonFoodClassifier } from './food-vs-non-food.classifier';
import { MealTypeClassifier } from './meal-type.classifier';

export interface VisionScanDecision {
  provider: string;
  status: 'success' | 'uncertain' | 'no_food_detected';
  confidence: number;
  mealType: 'single_item' | 'mixed_plate' | 'packaged_food' | 'drink' | 'unclear';
  message: string;
  components: FoodPrediction[];
  notes: string[];
}

@Injectable()
export class VisionScanService {
  constructor(
    @Inject(FoodRecognitionService)
    private readonly foodRecognitionService: FoodRecognitionService,
    @Inject(FoodVsNonFoodClassifier)
    private readonly foodVsNonFoodClassifier: FoodVsNonFoodClassifier,
    @Inject(MealTypeClassifier)
    private readonly mealTypeClassifier: MealTypeClassifier,
    @Inject(FoodLabelNormalizer)
    private readonly foodLabelNormalizer: FoodLabelNormalizer,
    @Inject(FoodComponentDetector)
    private readonly foodComponentDetector: FoodComponentDetector,
    @Inject(ConfidenceResolver)
    private readonly confidenceResolver: ConfidenceResolver
  ) {}

  async analyze(imagePath: string, imageUrl: string): Promise<VisionScanDecision> {
    const { provider, analysis } = await this.foodRecognitionService.analyze(imagePath, imageUrl);

    const foodDecision = this.foodVsNonFoodClassifier.classify(analysis);
    const mealType = this.mealTypeClassifier.classify(analysis);

    const rawCandidates = [
      ...(analysis.rawCandidates ?? []),
      ...analysis.predictions.map((prediction) => ({ label: prediction.name, confidence: prediction.confidence }))
    ];

    const normalized = this.foodLabelNormalizer.normalize(rawCandidates);
    const components = this.foodComponentDetector.detect(mealType.mealType, normalized);
    const hasLocalizedEvidence = components.some((component) => component.category && component.category !== 'other');
    const containsOnlyGenericFastFood =
      components.length > 0 && components.every((component) => ['burger', 'pizza'].includes(component.normalizedKey));
    const topComponentConfidence = components.reduce((max, component) => Math.max(max, component.confidence), 0);

    const resolution = this.confidenceResolver.resolve({
      isFood: foodDecision.isFood,
      foodConfidence: foodDecision.confidence,
      mealType: mealType.mealType,
      mealTypeConfidence: mealType.confidence,
      components,
      hasLocalizedEvidence,
      containsOnlyGenericFastFood,
      topComponentConfidence
    });

    const notes = [foodDecision.reason, analysis.reason ?? '']
      .map((note) => note.trim())
      .filter(Boolean);
    if (mealType.mealType === 'mixed_plate') {
      notes.push('Mixed meal detected. Nutrition is estimated from visible components.');
    }

    return {
      provider,
      status: resolution.status,
      confidence: resolution.confidence,
      mealType: mealType.mealType,
      message: resolution.message,
      components,
      notes
    };
  }
}
