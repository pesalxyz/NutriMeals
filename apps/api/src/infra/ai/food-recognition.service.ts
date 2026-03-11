import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { HeuristicFoodRecognitionProvider } from './heuristic-food-recognition.provider';
import { MockFoodRecognitionProvider } from './mock-food-recognition.provider';
import { OpenAIFoodRecognitionProvider } from './openai-food-recognition.provider';

@Injectable()
export class FoodRecognitionService {
  constructor(
    @Inject(HeuristicFoodRecognitionProvider)
    private readonly heuristicProvider: HeuristicFoodRecognitionProvider,
    @Inject(MockFoodRecognitionProvider)
    private readonly mockProvider: MockFoodRecognitionProvider,
    @Inject(OpenAIFoodRecognitionProvider)
    private readonly openAIProvider: OpenAIFoodRecognitionProvider
  ) {}

  async analyze(imagePath: string, imageUrl: string) {
    const provider = this.resolveProvider();
    const analysis = await provider.analyze(imagePath, imageUrl);
    return {
      provider: provider.name,
      analysis
    };
  }

  private resolveProvider() {
    const configured = (process.env.AI_PROVIDER ?? 'auto').toLowerCase();
    const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY?.trim());

    if (configured === 'openai') {
      if (!hasOpenAIKey) {
        throw new InternalServerErrorException('AI_PROVIDER=openai requires OPENAI_API_KEY.');
      }
      return this.openAIProvider;
    }
    if (configured === 'mock_fixed') return this.mockProvider;
    if (configured === 'auto') {
      return hasOpenAIKey ? this.openAIProvider : this.heuristicProvider;
    }
    return this.heuristicProvider;
  }
}
