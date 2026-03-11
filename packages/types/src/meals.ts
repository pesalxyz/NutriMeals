import type { EstimatedMealItem } from './scan';
import type { NutritionValues } from './nutrition';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface SaveMealRequest {
  scanId?: string;
  category: MealCategory;
  eatenAt: string;
  imageUrl?: string;
  items: EstimatedMealItem[];
}

export interface MealSummary {
  id: string;
  category: MealCategory;
  eatenAt: string;
  totals: NutritionValues;
  imageUrl?: string;
}
