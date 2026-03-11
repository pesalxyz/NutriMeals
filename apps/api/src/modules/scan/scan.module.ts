import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../../infra/ai/ai.module';
import { StorageModule } from '../../infra/storage/storage.module';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { NutritionEstimationService } from './nutrition-estimation.service';
import { VisionScanService } from './vision-scan.service';
import { FoodVsNonFoodClassifier } from './food-vs-non-food.classifier';
import { MealTypeClassifier } from './meal-type.classifier';
import { FoodLabelNormalizer } from './food-label-normalizer.service';
import { FoodComponentDetector } from './food-component-detector.service';
import { ConfidenceResolver } from './confidence-resolver.service';
import { VisionDescriptionService } from './vision-description.service';
import { OpenAINutritionInferenceService } from './openai-nutrition-inference.service';
import { NutritionResultFormatter } from './nutrition-result-formatter.service';
import { ScanResultService } from './scan-result.service';

@Module({
  imports: [AuthModule, AiModule, StorageModule],
  controllers: [ScanController],
  providers: [
    ScanService,
    NutritionEstimationService,
    ScanResultService,
    VisionDescriptionService,
    OpenAINutritionInferenceService,
    NutritionResultFormatter,
    VisionScanService,
    FoodVsNonFoodClassifier,
    MealTypeClassifier,
    FoodLabelNormalizer,
    FoodComponentDetector,
    ConfidenceResolver
  ],
  exports: [NutritionEstimationService]
})
export class ScanModule {}
