import type { PortionUnitCode } from '@nutriscan/types';

export interface PortionResolutionInput {
  unit: PortionUnitCode;
  quantity: number;
  gramsPerUnit?: number;
}

const DEFAULT_GRAMS_PER_UNIT: Record<PortionUnitCode, number> = {
  gram: 1,
  piece: 50,
  bowl: 250,
  plate: 350,
  cup: 240,
  tablespoon: 15,
  teaspoon: 5
};

export function resolvePortionToGrams(input: PortionResolutionInput): { grams: number; isEstimated: boolean } {
  const defaultFactor = DEFAULT_GRAMS_PER_UNIT[input.unit];
  const factor = input.gramsPerUnit ?? defaultFactor;
  const grams = Math.max(0, input.quantity) * factor;
  const isEstimated = input.unit === 'gram' ? false : input.gramsPerUnit == null;
  return { grams: Number(grams.toFixed(2)), isEstimated };
}

export function getDefaultGramsPerUnit(unit: PortionUnitCode): number {
  return DEFAULT_GRAMS_PER_UNIT[unit];
}
