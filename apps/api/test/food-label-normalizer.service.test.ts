import { describe, expect, it } from 'vitest';
import { FoodLabelNormalizer } from '../src/modules/scan/food-label-normalizer.service';

describe('FoodLabelNormalizer', () => {
  const normalizer = new FoodLabelNormalizer();

  it('maps omelette/noodle/sausage labels without forcing nasi putih or telur balado', () => {
    const labels = [
      { label: 'omelette with ketchup', confidence: 0.91 },
      { label: 'fried noodles', confidence: 0.86 },
      { label: 'sausage slices', confidence: 0.81 },
      { label: 'boiled egg', confidence: 0.79 }
    ];

    const result = normalizer.normalize(labels);
    const keys = result.map((item) => item.normalizedKey);

    expect(keys).toContain('telur_dadar');
    expect(keys).toContain('mie_goreng');
    expect(keys).toContain('sosis');
    expect(keys).toContain('telur_rebus');
    expect(keys).not.toContain('nasi_putih');
    expect(keys).not.toContain('telur_balado');
  });
});
