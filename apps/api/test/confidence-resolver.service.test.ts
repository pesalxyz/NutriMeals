import { describe, expect, it } from 'vitest';
import { ConfidenceResolver } from '../src/modules/scan/confidence-resolver.service';
import type { FoodPrediction } from '@nutriscan/types';

describe('ConfidenceResolver', () => {
  const resolver = new ConfidenceResolver();

  it('returns no_food_detected when image is not food', () => {
    const result = resolver.resolve({
      isFood: false,
      foodConfidence: 0.2,
      mealType: 'unclear',
      mealTypeConfidence: 0.4,
      components: [],
      hasLocalizedEvidence: false,
      containsOnlyGenericFastFood: false,
      topComponentConfidence: 0
    });

    expect(result.status).toBe('no_food_detected');
  });

  it('returns uncertain for generic fast-food-only labels under mixed meal context', () => {
    const components: FoodPrediction[] = [
      { name: 'Burger', normalizedKey: 'burger', confidence: 0.82, suggestedUnit: 'piece', category: 'other' },
      { name: 'Pizza', normalizedKey: 'pizza', confidence: 0.8, suggestedUnit: 'piece', category: 'other' }
    ];

    const result = resolver.resolve({
      isFood: true,
      foodConfidence: 0.9,
      mealType: 'mixed_plate',
      mealTypeConfidence: 0.62,
      components,
      hasLocalizedEvidence: false,
      containsOnlyGenericFastFood: true,
      topComponentConfidence: 0.82
    });

    expect(result.status).toBe('uncertain');
  });

  it('returns success for confident localized mixed meal components', () => {
    const components: FoodPrediction[] = [
      { name: 'Nasi Putih', normalizedKey: 'nasi_putih', confidence: 0.82, suggestedUnit: 'bowl', category: 'rice' },
      { name: 'Ayam Goreng', normalizedKey: 'ayam_goreng', confidence: 0.8, suggestedUnit: 'piece', category: 'protein' },
      { name: 'Sambal Merah', normalizedKey: 'sambal_merah', confidence: 0.76, suggestedUnit: 'tablespoon', category: 'sambal' }
    ];

    const result = resolver.resolve({
      isFood: true,
      foodConfidence: 0.9,
      mealType: 'mixed_plate',
      mealTypeConfidence: 0.85,
      components,
      hasLocalizedEvidence: true,
      containsOnlyGenericFastFood: false,
      topComponentConfidence: 0.82
    });

    expect(result.status).toBe('success');
  });
});
