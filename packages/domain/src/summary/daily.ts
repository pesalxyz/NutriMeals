import type { NutritionValues } from '@nutriscan/types';
import { sumNutrition } from '../nutrition/calculate';

export interface DailyProgress {
  totals: NutritionValues;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  progress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export function buildDailyProgress(input: {
  entries: NutritionValues[];
  targets: { calories: number; protein: number; carbs: number; fat: number };
}): DailyProgress {
  const totals = sumNutrition(input.entries);
  return {
    totals,
    targets: input.targets,
    progress: {
      calories: safeRatio(totals.calories, input.targets.calories),
      protein: safeRatio(totals.protein, input.targets.protein),
      carbs: safeRatio(totals.carbs, input.targets.carbs),
      fat: safeRatio(totals.fat, input.targets.fat)
    }
  };
}

function safeRatio(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((value / target) * 10000) / 100;
}
