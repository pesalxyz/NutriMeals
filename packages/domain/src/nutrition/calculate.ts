import type { NutritionValues } from '@nutriscan/types';

export interface NutritionPer100g extends NutritionValues {}

export function calculateNutritionForGrams(per100g: NutritionPer100g, grams: number): NutritionValues {
  const factor = grams / 100;
  return {
    calories: round2(per100g.calories * factor),
    protein: round2(per100g.protein * factor),
    fat: round2(per100g.fat * factor),
    carbs: round2(per100g.carbs * factor),
    sugar: round2(per100g.sugar * factor),
    fiber: round2(per100g.fiber * factor),
    sodium: round2(per100g.sodium * factor)
  };
}

export function sumNutrition(values: NutritionValues[]): NutritionValues {
  return values.reduce(
    (acc, cur) => ({
      calories: round2(acc.calories + cur.calories),
      protein: round2(acc.protein + cur.protein),
      fat: round2(acc.fat + cur.fat),
      carbs: round2(acc.carbs + cur.carbs),
      sugar: round2(acc.sugar + cur.sugar),
      fiber: round2(acc.fiber + cur.fiber),
      sodium: round2(acc.sodium + cur.sodium)
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, sugar: 0, fiber: 0, sodium: 0 }
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
