import { describe, expect, it } from 'vitest';
import { calculateNutritionForGrams, sumNutrition } from '../nutrition/calculate';

describe('nutrition calculations', () => {
  it('scales nutrition by gram factor', () => {
    const result = calculateNutritionForGrams(
      { calories: 200, protein: 10, fat: 5, carbs: 20, sugar: 2, fiber: 3, sodium: 50 },
      50
    );
    expect(result.calories).toBe(100);
    expect(result.protein).toBe(5);
  });

  it('sums nutrition', () => {
    const totals = sumNutrition([
      { calories: 100, protein: 5, fat: 2, carbs: 10, sugar: 1, fiber: 1, sodium: 10 },
      { calories: 150, protein: 7, fat: 4, carbs: 12, sugar: 2, fiber: 2, sodium: 20 }
    ]);
    expect(totals.calories).toBe(250);
    expect(totals.protein).toBe(12);
  });
});
