export interface GoogleAuthRequest {
  idToken: string;
}

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose_weight' | 'maintain' | 'gain_weight' | 'healthy_eating';

export interface ProfileInput {
  fullName: string;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: GoalType;
}

type PortionUnitCode = 'gram' | 'piece' | 'bowl' | 'plate' | 'cup' | 'tablespoon' | 'teaspoon';

interface NutritionValues {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar: number;
  fiber: number;
  sodium: number;
}

type MealType = 'single_item' | 'mixed_plate' | 'packaged_food' | 'drink' | 'unclear';

interface FoodPrediction {
  name: string;
  normalizedKey: string;
  confidence: number;
  suggestedUnit: PortionUnitCode;
  suggestedQuantity?: number;
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
