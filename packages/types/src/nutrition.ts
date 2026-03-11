export interface NutritionValues {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar: number;
  fiber: number;
  sodium: number;
}

export type PortionUnitCode = 'gram' | 'piece' | 'bowl' | 'plate' | 'cup' | 'tablespoon' | 'teaspoon';

export interface PortionInput {
  unit: PortionUnitCode;
  quantity: number;
}

export interface NutritionEstimateResult {
  nutrition: NutritionValues;
  gramsResolved: number;
  isEstimated: boolean;
}
