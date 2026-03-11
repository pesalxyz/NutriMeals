import type { PortionInput, NutritionValues, PortionUnitCode } from './nutrition';

export type ScanStatus = 'success' | 'uncertain' | 'no_food_detected';
export type MealType = 'single_item' | 'mixed_plate' | 'packaged_food' | 'drink' | 'unclear';

export interface FoodPrediction {
  name: string;
  normalizedKey: string;
  confidence: number;
  suggestedUnit: PortionUnitCode;
  suggestedQuantity?: number;
  estimatedWeightGrams?: number;
  componentNotes?: string;
  category?: 'rice' | 'protein' | 'egg' | 'sambal' | 'vegetable' | 'sauce' | 'side' | 'drink' | 'other';
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScanProcessSuccessResponse {
  status: 'success';
  isFood: true;
  confidence: number;
  mealType: MealType;
  scanId: string;
  imageUrl: string;
  provider: string;
  message: string;
  description?: string;
  notes: string[];
  uncertaintyNotes?: string[];
  items: Array<FoodPrediction & { nutrition: NutritionValues }>;
  totalNutrition: NutritionValues;
}

export interface ScanProcessUncertainResponse {
  status: 'uncertain';
  isFood: true;
  confidence: number;
  mealType: MealType;
  scanId: string;
  imageUrl: string;
  provider: string;
  message: string;
  description?: string;
  notes: string[];
  uncertaintyNotes?: string[];
  suggestions: FoodPrediction[];
  estimatedTotalNutrition?: NutritionValues;
}

export interface ScanProcessNoFoodResponse {
  status: 'no_food_detected';
  isFood: false;
  confidence: number;
  mealType: MealType;
  scanId: string;
  imageUrl: string;
  provider: string;
  message: string;
  description?: string;
  notes: string[];
}

export type ScanProcessResponse =
  | ScanProcessSuccessResponse
  | ScanProcessUncertainResponse
  | ScanProcessNoFoodResponse;

export interface EditableScanItem {
  name: string;
  normalizedKey?: string;
  portion: PortionInput;
}

export interface ScanEstimateRequest {
  scanId?: string;
  items: EditableScanItem[];
}

export interface EstimatedMealItem {
  name: string;
  normalizedKey: string;
  portion: PortionInput;
  gramsResolved: number;
  isEstimated: boolean;
  nutrition: NutritionValues;
}

export interface ScanEstimateResponse {
  items: EstimatedMealItem[];
  totals: NutritionValues;
}
