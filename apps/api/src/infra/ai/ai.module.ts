import { Global, Module } from '@nestjs/common';
import { FoodRecognitionService } from './food-recognition.service';
import { HeuristicFoodRecognitionProvider } from './heuristic-food-recognition.provider';
import { MockFoodRecognitionProvider } from './mock-food-recognition.provider';
import { OpenAIFoodRecognitionProvider } from './openai-food-recognition.provider';

@Global()
@Module({
  providers: [MockFoodRecognitionProvider, HeuristicFoodRecognitionProvider, OpenAIFoodRecognitionProvider, FoodRecognitionService],
  exports: [FoodRecognitionService]
})
export class AiModule {}
