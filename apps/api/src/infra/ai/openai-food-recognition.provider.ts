import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { FoodPrediction } from '@nutriscan/types';
import type { FoodRecognitionProvider, MealTypeHint, VisionAnalysisResult } from './food-recognition.types';

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class OpenAIFoodRecognitionProvider implements FoodRecognitionProvider {
  name = 'openai_vision';

  async analyze(imagePath: string, _imageUrl: string): Promise<VisionAnalysisResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return {
        isFoodCandidate: false,
        overallConfidence: 0,
        predictions: [],
        reason: 'OPENAI_API_KEY is not configured.'
      };
    }

    try {
      const imageBuffer = await readFile(imagePath);
      const dataUrl = `data:${mimeFromExtension(imagePath)};base64,${imageBuffer.toString('base64')}`;

      const body = {
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'You are a food vision parser for nutrition tracking. Return STRICT JSON only with keys: isFoodCandidate(boolean), overallConfidence(number 0..1), mealTypeHint(single_item|mixed_plate|packaged_food|drink|unclear), predictions(array of {name, normalizedKey, confidence, suggestedUnit}), rawCandidates(array of {label, confidence}), reason(string). Do not force Indonesian dish names unless visually supported. For mixed meals, output visible components first (e.g., noodles, omelette, boiled egg, sausage, fried chicken pieces, ketchup/sauce, rice, vegetables). Only use pizza/burger when clearly visible.'
              },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ]
      };

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        return {
          isFoodCandidate: false,
          overallConfidence: 0,
          predictions: [],
          reason: `OpenAI request failed with status ${res.status}`
        };
      }

      const payload = (await res.json()) as OpenAIResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        return {
          isFoodCandidate: false,
          overallConfidence: 0,
          predictions: [],
          reason: 'OpenAI returned empty content.'
        };
      }

      try {
        const parsed = JSON.parse(content) as {
          isFoodCandidate?: boolean;
          overallConfidence?: number;
          mealTypeHint?: MealTypeHint;
          predictions?: Array<{ name: string; normalizedKey: string; confidence: number; suggestedUnit: FoodPrediction['suggestedUnit'] }>;
          rawCandidates?: Array<{ label: string; confidence: number }>;
          reason?: string;
        };

        return {
          isFoodCandidate: Boolean(parsed.isFoodCandidate),
          overallConfidence: clamp(parsed.overallConfidence ?? 0),
          predictions: (parsed.predictions ?? []).map((p) => ({
            name: p.name,
            normalizedKey: p.normalizedKey,
            confidence: clamp(p.confidence),
            suggestedUnit: p.suggestedUnit ?? 'gram'
          })),
          rawCandidates: (parsed.rawCandidates ?? []).map((candidate) => ({
            label: candidate.label,
            confidence: clamp(candidate.confidence)
          })),
          mealTypeHint: parsed.mealTypeHint ?? 'unclear',
          reason: parsed.reason,
          rawMeta: payload
        };
      } catch {
        return {
          isFoodCandidate: false,
          overallConfidence: 0,
          predictions: [],
          reason: 'OpenAI content was not valid JSON.'
        };
      }
    } catch (error) {
      return {
        isFoodCandidate: false,
        overallConfidence: 0,
        predictions: [],
        reason: error instanceof Error ? error.message : 'OpenAI provider error'
      };
    }
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function mimeFromExtension(pathname: string): string {
  const ext = extname(pathname).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}
