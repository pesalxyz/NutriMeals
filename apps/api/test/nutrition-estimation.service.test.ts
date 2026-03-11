import { describe, expect, it, vi } from 'vitest';
import { NutritionEstimationService } from '../src/modules/scan/nutrition-estimation.service';

describe('NutritionEstimationService', () => {
  it('falls back to generic nutrition for unknown food and marks estimate', async () => {
    const prisma = {
      scan: {
        findUnique: vi.fn().mockResolvedValue(null)
      },
      foodItem: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    } as any;

    const service = new NutritionEstimationService(prisma);
    const result = await service.estimate({
      items: [{ name: 'unknown dish', unit: 'bowl', quantity: 1 }]
    } as any);

    expect(result.items[0].isEstimated).toBe(true);
    expect(result.items[0].nutrition.calories).toBeGreaterThan(0);
    expect(result.totals.calories).toBe(result.items[0].nutrition.calories);
  });

  it('maps white_rice key to nasi_putih nutrition entry', async () => {
    const prisma = {
      scan: {
        findUnique: vi.fn().mockResolvedValue(null)
      },
      foodItem: {
        findFirst: vi.fn().mockResolvedValue({
          nutrition: {
            calories: 130,
            protein: 2.4,
            fat: 0.3,
            carbs: 28.2,
            sugar: 0.1,
            fiber: 0.4,
            sodium: 1
          }
        })
      }
    } as any;

    const service = new NutritionEstimationService(prisma);
    const result = await service.estimate({
      items: [{ name: 'white rice', normalizedKey: 'white_rice', unit: 'gram', quantity: 100 }]
    } as any);

    expect(prisma.foodItem.findFirst).toHaveBeenCalled();
    expect(result.items[0].normalizedKey).toBe('nasi_putih');
    expect(result.items[0].nutrition.calories).toBe(130);
    expect(result.items[0].nutrition.protein).toBe(2.4);
  });

  it('uses inference grams-per-unit for satay piece instead of generic 50g per piece', async () => {
    const prisma = {
      scan: {
        findUnique: vi.fn().mockResolvedValue({
          nutritionResult: {
            components: [
              {
                name: 'satay',
                normalizedKey: 'sate_daging',
                suggestedUnit: 'piece',
                suggestedQuantity: 10,
                estimatedWeightGrams: 150,
                nutrition: {
                  calories: 420,
                  protein: 34,
                  fat: 24,
                  carbs: 8,
                  sugar: 3,
                  fiber: 1,
                  sodium: 520
                }
              }
            ]
          }
        })
      },
      foodItem: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    } as any;

    const service = new NutritionEstimationService(prisma);
    const result = await service.estimate({
      scanId: 'scan-1',
      items: [{ name: 'satay', normalizedKey: 'sate_daging', unit: 'piece', quantity: 10 }]
    } as any);

    expect(result.items[0].gramsResolved).toBe(150);
  });
});
