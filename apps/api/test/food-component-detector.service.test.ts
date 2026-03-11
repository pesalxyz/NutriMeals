import { describe, expect, it } from 'vitest';
import { FoodComponentDetector } from '../src/modules/scan/food-component-detector.service';
import type { NormalizedFoodCandidate } from '../src/modules/scan/food-label-normalizer.service';

describe('FoodComponentDetector', () => {
  const detector = new FoodComponentDetector();

  it('prioritizes localized mixed-meal components over generic fast food labels', () => {
    const candidates: NormalizedFoodCandidate[] = [
      { label: 'burger', normalizedKey: 'burger', displayName: 'Burger', confidence: 0.92, category: 'other', suggestedUnit: 'piece' },
      { label: 'pizza', normalizedKey: 'pizza', displayName: 'Pizza', confidence: 0.9, category: 'other', suggestedUnit: 'piece' },
      { label: 'nasi putih', normalizedKey: 'nasi_putih', displayName: 'Nasi Putih', confidence: 0.74, category: 'rice', suggestedUnit: 'bowl' },
      { label: 'ayam goreng', normalizedKey: 'ayam_goreng', displayName: 'Ayam Goreng', confidence: 0.7, category: 'protein', suggestedUnit: 'piece' },
      { label: 'sambal', normalizedKey: 'sambal_merah', displayName: 'Sambal Merah', confidence: 0.64, category: 'sambal', suggestedUnit: 'tablespoon' },
      { label: 'daun singkong', normalizedKey: 'daun_singkong', displayName: 'Daun Singkong', confidence: 0.61, category: 'vegetable', suggestedUnit: 'bowl' }
    ];

    const results = detector.detect('mixed_plate', candidates);
    const keys = results.map((item) => item.normalizedKey);

    expect(keys).toContain('nasi_putih');
    expect(keys).toContain('ayam_goreng');
    expect(keys).toContain('sambal_merah');
    expect(keys).not.toContain('burger');
    expect(keys).not.toContain('pizza');
  });
});
