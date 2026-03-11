import { describe, expect, it } from 'vitest';
import { NutritionResultFormatter } from '../src/modules/scan/nutrition-result-formatter.service';

describe('NutritionResultFormatter', () => {
  const formatter = new NutritionResultFormatter();

  it('normalizes inferred components and totals', () => {
    const result = formatter.format({
      mealType: 'mixed_plate',
      summary: 'Estimated from visible components.',
      components: [
        {
          name: 'Mie Goreng',
          normalizedKey: 'mie_goreng',
          portion: { amount: 1, unit: 'plate' },
          estimatedWeightGrams: 180,
          confidence: 0.82,
          nutrition: { calories: 320, protein: 8, fat: 12, carbs: 42, sugar: 4, fiber: 2, sodium: 620 },
          notes: 'Visible noodles'
        }
      ],
      totalNutrition: { calories: 320, protein: 8, fat: 12, carbs: 42, sugar: 4, fiber: 2, sodium: 620 },
      uncertaintyNotes: ['Portion is estimated from a single image.']
    });

    expect(result).not.toBeNull();
    expect(result?.components[0]?.name).toBe('Mie Goreng');
    expect(result?.components[0]?.suggestedUnit).toBe('plate');
    expect(result?.components[0]?.suggestedQuantity).toBe(1);
    expect(result?.totalNutrition.calories).toBe(320);
  });

  it('converts tiny satay gram portion into realistic skewer count', () => {
    const result = formatter.format({
      mealType: 'single_item',
      summary: 'Satay skewers with peanut sauce.',
      components: [
        {
          name: 'satay (grilled meat skewers)',
          normalizedKey: 'satay',
          portion: { amount: 3, unit: 'gram' },
          estimatedWeightGrams: 3,
          confidence: 0.95,
          nutrition: { calories: 9, protein: 1, fat: 0.5, carbs: 0.2, sugar: 0.1, fiber: 0, sodium: 12 },
          notes: 'Multiple skewers visible'
        }
      ],
      totalNutrition: { calories: 9, protein: 1, fat: 0.5, carbs: 0.2, sugar: 0.1, fiber: 0, sodium: 12 },
      uncertaintyNotes: []
    });

    expect(result).not.toBeNull();
    expect(result?.components[0]?.suggestedUnit).toBe('piece');
    expect((result?.components[0]?.suggestedQuantity ?? 0) >= 3).toBe(true);
    expect((result?.components[0]?.suggestedQuantity ?? 0) <= 6).toBe(true);
    expect((result?.components[0]?.estimatedWeightGrams ?? 0) >= 45).toBe(true);
  });

  it('keeps peanut sauce as spoon-based unit even if notes mention satay', () => {
    const result = formatter.format({
      mealType: 'mixed_plate',
      summary: 'Satay with peanut sauce.',
      components: [
        {
          name: 'peanut sauce',
          normalizedKey: 'peanut_sauce',
          portion: { amount: 8, unit: 'piece' },
          estimatedWeightGrams: 400,
          confidence: 0.95,
          nutrition: { calories: 600, protein: 18, fat: 44, carbs: 36, sugar: 12, fiber: 6, sodium: 820 },
          notes: 'Sauce covering satay skewers'
        }
      ],
      totalNutrition: { calories: 600, protein: 18, fat: 44, carbs: 36, sugar: 12, fiber: 6, sodium: 820 },
      uncertaintyNotes: []
    });

    expect(result).not.toBeNull();
    expect(result?.components[0]?.suggestedUnit).toBe('tablespoon');
    expect((result?.components[0]?.suggestedQuantity ?? 0) > 1).toBe(true);
    expect((result?.components[0]?.estimatedWeightGrams ?? 0) <= 150).toBe(true);
  });

  it('normalizes satay piece grams to realistic per-skewer range', () => {
    const result = formatter.format({
      mealType: 'single_item',
      summary: 'Satay plate with peanut sauce.',
      components: [
        {
          name: 'satay (grilled meat skewers)',
          normalizedKey: 'satay',
          portion: { amount: 8, unit: 'piece' },
          estimatedWeightGrams: 400,
          confidence: 0.95,
          nutrition: { calories: 760, protein: 56, fat: 48, carbs: 16, sugar: 6, fiber: 2, sodium: 920 },
          notes: '8 skewers visible'
        }
      ],
      totalNutrition: { calories: 760, protein: 56, fat: 48, carbs: 16, sugar: 6, fiber: 2, sodium: 920 },
      uncertaintyNotes: []
    });

    expect(result).not.toBeNull();
    expect(result?.components[0]?.suggestedUnit).toBe('piece');
    expect(result?.components[0]?.suggestedQuantity).toBe(8);
    expect(result?.components[0]?.estimatedWeightGrams).toBe(120);
  });

  it('keeps satay count conservative without explicit count evidence', () => {
    const result = formatter.format({
      mealType: 'single_item',
      summary: 'Satay with rice.',
      components: [
        {
          name: 'meat skewers',
          normalizedKey: 'satay',
          portion: { amount: 10, unit: 'piece' },
          estimatedWeightGrams: 400,
          confidence: 0.9,
          nutrition: { calories: 700, protein: 45, fat: 40, carbs: 15, sugar: 5, fiber: 1, sodium: 600 },
          notes: 'Satay with rice plate'
        }
      ],
      totalNutrition: { calories: 700, protein: 45, fat: 40, carbs: 15, sugar: 5, fiber: 1, sodium: 600 },
      uncertaintyNotes: []
    });

    expect(result).not.toBeNull();
    expect(result?.components[0]?.suggestedUnit).toBe('piece');
    expect((result?.components[0]?.suggestedQuantity ?? 0) <= 6).toBe(true);
  });

  it('normalizes tiny peanut sauce grams into tablespoon estimate', () => {
    const result = formatter.format({
      mealType: 'single_item',
      summary: 'Satay with peanut sauce coating.',
      components: [
        {
          name: 'peanut sauce',
          normalizedKey: 'peanut_sauce',
          portion: { amount: 3, unit: 'gram' },
          estimatedWeightGrams: 3,
          confidence: 0.9,
          nutrition: { calories: 18, protein: 0.6, fat: 1.2, carbs: 2, sugar: 0.5, fiber: 0.2, sodium: 20 },
          notes: 'coating most skewers'
        }
      ],
      totalNutrition: { calories: 18, protein: 0.6, fat: 1.2, carbs: 2, sugar: 0.5, fiber: 0.2, sodium: 20 },
      uncertaintyNotes: []
    });

    expect(result).not.toBeNull();
    expect(result?.components[0]?.suggestedUnit).toBe('tablespoon');
    expect((result?.components[0]?.estimatedWeightGrams ?? 0) >= 45).toBe(true);
  });

  it('upgrades unrealistic tiny gram portions for visible solids', () => {
    const result = formatter.format({
      mealType: 'mixed_plate',
      summary: 'Mixed meal with fried chicken pieces and noodles.',
      components: [
        {
          name: 'ayam goreng',
          normalizedKey: 'ayam_goreng',
          portion: { amount: 2, unit: 'gram' },
          estimatedWeightGrams: 2,
          confidence: 0.98,
          nutrition: { calories: 6, protein: 0.5, fat: 0.3, carbs: 0.1, sugar: 0, fiber: 0, sodium: 5 },
          notes: 'about 6 small pieces visible'
        },
        {
          name: 'mie',
          normalizedKey: 'mie_goreng',
          portion: { amount: 1, unit: 'gram' },
          estimatedWeightGrams: 1,
          confidence: 0.9,
          nutrition: { calories: 2, protein: 0.1, fat: 0, carbs: 0.3, sugar: 0, fiber: 0, sodium: 1 },
          notes: 'visible noodle section'
        }
      ],
      totalNutrition: { calories: 8, protein: 0.6, fat: 0.3, carbs: 0.4, sugar: 0, fiber: 0, sodium: 6 },
      uncertaintyNotes: []
    });

    expect(result).not.toBeNull();
    const chicken = result?.components.find((c) => c.normalizedKey === 'ayam_goreng');
    const noodle = result?.components.find((c) => c.normalizedKey === 'mie_goreng');

    expect(chicken?.suggestedUnit).toBe('gram');
    expect((chicken?.suggestedQuantity ?? 0) >= 120).toBe(true);
    expect((chicken?.estimatedWeightGrams ?? 0) >= 120).toBe(true);

    expect(noodle?.suggestedUnit).toBe('bowl');
    expect(noodle?.suggestedQuantity).toBe(1);
    expect((noodle?.estimatedWeightGrams ?? 0) >= 100).toBe(true);
  });
});
