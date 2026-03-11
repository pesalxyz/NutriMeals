import { describe, expect, it } from 'vitest';
import { buildDailyProgress } from '../summary/daily';

describe('daily progress', () => {
  it('aggregates and computes progress ratios', () => {
    const result = buildDailyProgress({
      entries: [
        { calories: 600, protein: 20, fat: 15, carbs: 70, sugar: 10, fiber: 5, sodium: 300 },
        { calories: 400, protein: 15, fat: 10, carbs: 50, sugar: 7, fiber: 4, sodium: 200 }
      ],
      targets: { calories: 2000, protein: 100, carbs: 250, fat: 70 }
    });
    expect(result.totals.calories).toBe(1000);
    expect(result.progress.calories).toBe(50);
  });
});
