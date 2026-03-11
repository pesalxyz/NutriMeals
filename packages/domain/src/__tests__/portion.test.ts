import { describe, expect, it } from 'vitest';
import { resolvePortionToGrams } from '../portion/conversion';

describe('resolvePortionToGrams', () => {
  it('converts grams directly', () => {
    expect(resolvePortionToGrams({ unit: 'gram', quantity: 120 })).toEqual({ grams: 120, isEstimated: false });
  });

  it('uses default estimate for non-gram units', () => {
    expect(resolvePortionToGrams({ unit: 'cup', quantity: 1 })).toEqual({ grams: 240, isEstimated: true });
  });
});
