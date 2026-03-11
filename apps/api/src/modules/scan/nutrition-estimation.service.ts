import { Inject, Injectable } from '@nestjs/common';
import { calculateNutritionForGrams, resolvePortionToGrams, sumNutrition } from '@nutriscan/domain';
import type { PortionUnitCode, ScanEstimateResponse } from '@nutriscan/types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EstimateScanDto } from './dto';

type InferredComponent = {
  name?: string;
  normalizedKey?: string;
  suggestedUnit?: string;
  suggestedQuantity?: number;
  estimatedWeightGrams?: number;
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    sugar?: number;
    fiber?: number;
    sodium?: number;
  };
};

@Injectable()
export class NutritionEstimationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async estimate(dto: EstimateScanDto): Promise<ScanEstimateResponse> {
    const results: ScanEstimateResponse['items'] = [];
    const inferredMap = await this.loadInferenceMap(dto.scanId);

    for (const item of dto.items) {
      const normalizedKey = canonicalize(item.normalizedKey ?? normalize(item.name));
      const nameLower = item.name.toLowerCase().trim();
      const food = await this.prisma.foodItem.findFirst({
        where: {
          OR: [
            { normalizedKey },
            { normalizedKey: normalize(item.name) },
            { aliases: { has: item.name.toLowerCase() } },
            { name: { equals: item.name, mode: 'insensitive' } }
          ]
        },
        include: { nutrition: true }
      });

      const inferred = inferredMap.get(normalizedKey) ?? inferredMap.get(nameLower);
      const resolved = resolvePortionToGrams({
        unit: item.unit,
        quantity: item.quantity,
        gramsPerUnit: deriveGramsPerUnit(item.unit, inferred)
      });
      const inferredPer100 = inferred ? toPer100FromInference(inferred) : null;

      const nutritionPer100g = food?.nutrition
        ? {
            calories: food.nutrition.calories,
            protein: food.nutrition.protein,
            fat: food.nutrition.fat,
            carbs: food.nutrition.carbs,
            sugar: food.nutrition.sugar,
            fiber: food.nutrition.fiber,
            sodium: food.nutrition.sodium
          }
        : inferredPer100 ?? {
            calories: 170,
            protein: 8,
            fat: 6,
            carbs: 18,
            sugar: 2,
            fiber: 1.5,
            sodium: 180
          };

      const nutrition = calculateNutritionForGrams(
        {
          calories: nutritionPer100g.calories,
          protein: nutritionPer100g.protein,
          fat: nutritionPer100g.fat,
          carbs: nutritionPer100g.carbs,
          sugar: nutritionPer100g.sugar,
          fiber: nutritionPer100g.fiber,
          sodium: nutritionPer100g.sodium
        },
        resolved.grams
      );

      results.push({
        name: item.name,
        normalizedKey,
        portion: { unit: item.unit, quantity: item.quantity },
        gramsResolved: resolved.grams,
        isEstimated: resolved.isEstimated || !food || Boolean(inferred),
        nutrition
      });
    }

    return {
      items: results,
      totals: sumNutrition(results.map((entry) => entry.nutrition))
    };
  }

  private async loadInferenceMap(scanId?: string): Promise<Map<string, InferredComponent>> {
    const map = new Map<string, InferredComponent>();
    if (!scanId) return map;

    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: { nutritionResult: true }
    });
    const raw = scan?.nutritionResult as { components?: InferredComponent[] } | null | undefined;
    if (!raw || !Array.isArray(raw.components)) return map;

    for (const component of raw.components) {
      const key = component.normalizedKey ? canonicalize(component.normalizedKey.toLowerCase()) : null;
      const name = component.name ? component.name.toLowerCase().trim() : null;
      if (key) map.set(key, component);
      if (name) map.set(name, component);
    }

    return map;
  }
}

function deriveGramsPerUnit(unit: PortionUnitCode, inferred?: InferredComponent): number | undefined {
  if (!inferred || typeof inferred.estimatedWeightGrams !== 'number' || inferred.estimatedWeightGrams <= 0) return undefined;
  if (typeof inferred.suggestedUnit !== 'string' || inferred.suggestedUnit !== unit) return undefined;
  if (typeof inferred.suggestedQuantity !== 'number' || inferred.suggestedQuantity <= 0) return undefined;
  return inferred.estimatedWeightGrams / inferred.suggestedQuantity;
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

function canonicalize(key: string): string {
  return KEY_CANONICAL_MAP[key] ?? key;
}

const KEY_CANONICAL_MAP: Record<string, string> = {
  white_rice: 'nasi_putih',
  steamed_rice: 'nasi_putih',
  plain_rice: 'nasi_putih',
  beef_satay: 'sate_daging',
  satay: 'sate_daging',
  grilled_meat_skewers: 'sate_daging',
  peanut_sauce: 'bumbu_kacang',
  groundnut_sauce: 'bumbu_kacang',
  cooked_carrot: 'cooked_carrot',
  carrot: 'cooked_carrot'
};

function toPer100FromInference(component: InferredComponent): {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar: number;
  fiber: number;
  sodium: number;
} | null {
  const grams = typeof component.estimatedWeightGrams === 'number' && component.estimatedWeightGrams > 0 ? component.estimatedWeightGrams : 0;
  const n = component.nutrition;
  if (!grams || !n) return null;

  const ratio = 100 / grams;
  return {
    calories: clamp((n.calories ?? 0) * ratio),
    protein: clamp((n.protein ?? 0) * ratio),
    fat: clamp((n.fat ?? 0) * ratio),
    carbs: clamp((n.carbs ?? 0) * ratio),
    sugar: clamp((n.sugar ?? 0) * ratio),
    fiber: clamp((n.fiber ?? 0) * ratio),
    sodium: clamp((n.sodium ?? 0) * ratio)
  };
}

function clamp(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
}
