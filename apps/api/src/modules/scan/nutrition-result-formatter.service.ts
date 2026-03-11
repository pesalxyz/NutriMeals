import { Injectable } from '@nestjs/common';
import type { FoodPrediction, MealType, NutritionValues, PortionUnitCode } from '@nutriscan/types';
import type { NutritionInferenceResult } from './openai-nutrition-inference.service';

const UNIT_SET = new Set<PortionUnitCode>(['gram', 'piece', 'bowl', 'plate', 'cup', 'tablespoon', 'teaspoon']);

export interface FormattedNutritionResult {
  mealType: MealType;
  summary: string;
  components: Array<FoodPrediction & { nutrition: NutritionValues }>;
  totalNutrition: NutritionValues;
  uncertaintyNotes: string[];
}

@Injectable()
export class NutritionResultFormatter {
  format(input: NutritionInferenceResult | null): FormattedNutritionResult | null {
    if (!input || !Array.isArray(input.components) || input.components.length === 0) return null;

    const components: Array<FoodPrediction & { nutrition: NutritionValues }> = input.components
      .map((component) => this.normalizeComponent(component))
      .filter((component): component is FoodPrediction & { nutrition: NutritionValues } => Boolean(component));

    if (!components.length) return null;

    const totalNutrition = normalizeNutrition(input.totalNutrition) ?? sumNutrition(components.map((item) => item.nutrition));

    return {
      mealType: normalizeMealType(input.mealType),
      summary: typeof input.summary === 'string' && input.summary.trim() ? input.summary.trim() : 'Nutrisi diestimasi dari analisis AI pada deskripsi makanan.',
      components,
      totalNutrition,
      uncertaintyNotes: Array.isArray(input.uncertaintyNotes)
        ? input.uncertaintyNotes.filter((note) => typeof note === 'string' && note.trim()).map((note) => note.trim()).slice(0, 6)
        : []
    };
  }

  private normalizeComponent(component: NutritionInferenceResult['components'][number]): (FoodPrediction & { nutrition: NutritionValues }) | null {
    if (!component || typeof component.name !== 'string' || !component.name.trim()) return null;
    const nutrition = normalizeNutrition(component.nutrition);
    if (!nutrition) return null;

    let unit = normalizeUnit(component.portion?.unit);
    let quantity = clampNumber(component.portion?.amount, 1, 0.1, 500);
    const confidence = clampNumber(component.confidence, 0.6, 0, 1);
    let grams = clampNumber(component.estimatedWeightGrams, 100, 1, 5000);

    const sauceAdjusted = adjustSaucePortion({
      name: component.name,
      notes: typeof component.notes === 'string' ? component.notes : '',
      unit,
      quantity,
      grams,
      nutrition
    });
    unit = sauceAdjusted.unit;
    quantity = sauceAdjusted.quantity;
    grams = sauceAdjusted.grams;
    const sauceAdjustedNutrition = sauceAdjusted.nutrition;

    const satayAdjusted = adjustSatayPortion({
      name: component.name,
      notes: typeof component.notes === 'string' ? component.notes : '',
      unit,
      quantity,
      grams,
      nutrition: sauceAdjustedNutrition
    });
    unit = satayAdjusted.unit;
    quantity = satayAdjusted.quantity;
    grams = satayAdjusted.grams;
    const solidAdjusted = adjustTinySolidPortion({
      name: component.name,
      notes: typeof component.notes === 'string' ? component.notes : '',
      unit,
      quantity,
      grams,
      nutrition: satayAdjusted.nutrition
    });
    unit = solidAdjusted.unit;
    quantity = solidAdjusted.quantity;
    grams = solidAdjusted.grams;
    const adjustedNutrition = solidAdjusted.nutrition;

    return {
      name: component.name.trim(),
      normalizedKey: normalizeKey(component.normalizedKey || component.name),
      confidence,
      suggestedUnit: unit,
      suggestedQuantity: quantity,
      estimatedWeightGrams: grams,
      componentNotes: typeof component.notes === 'string' ? component.notes.trim() : undefined,
      nutrition: adjustedNutrition
    };
  }
}

function normalizeMealType(value: unknown): MealType {
  if (value === 'single_item' || value === 'mixed_plate' || value === 'packaged_food' || value === 'drink' || value === 'unclear') {
    return value;
  }
  return 'unclear';
}

function normalizeNutrition(value: unknown): NutritionValues | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  return {
    calories: clampNumber(source.calories, 0, 0, 10000),
    protein: clampNumber(source.protein, 0, 0, 1000),
    fat: clampNumber(source.fat, 0, 0, 1000),
    carbs: clampNumber(source.carbs, 0, 0, 1000),
    sugar: clampNumber(source.sugar, 0, 0, 1000),
    fiber: clampNumber(source.fiber, 0, 0, 1000),
    sodium: clampNumber(source.sodium, 0, 0, 10000)
  };
}

function sumNutrition(items: NutritionValues[]): NutritionValues {
  return items.reduce(
    (acc, current) => ({
      calories: round2(acc.calories + current.calories),
      protein: round2(acc.protein + current.protein),
      fat: round2(acc.fat + current.fat),
      carbs: round2(acc.carbs + current.carbs),
      sugar: round2(acc.sugar + current.sugar),
      fiber: round2(acc.fiber + current.fiber),
      sodium: round2(acc.sodium + current.sodium)
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, sugar: 0, fiber: 0, sodium: 0 }
  );
}

function normalizeKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_');
  return KEY_CANONICAL_MAP[normalized] ?? normalized;
}

const KEY_CANONICAL_MAP: Record<string, string> = {
  white_rice: 'nasi_putih',
  steamed_rice: 'nasi_putih',
  plain_rice: 'nasi_putih',
  peanut_sauce: 'bumbu_kacang',
  groundnut_sauce: 'bumbu_kacang',
  satay: 'sate_daging',
  grilled_meat_skewers: 'sate_daging',
  beef_satay: 'sate_daging',
  carrot: 'cooked_carrot'
};

function normalizeUnit(value: unknown): PortionUnitCode {
  if (typeof value === 'string' && UNIT_SET.has(value as PortionUnitCode)) return value as PortionUnitCode;
  return 'gram';
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return round2(Math.max(min, Math.min(max, n)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function adjustSatayPortion(input: {
  name: string;
  notes: string;
  unit: PortionUnitCode;
  quantity: number;
  grams: number;
  nutrition: NutritionValues;
}): {
  unit: PortionUnitCode;
  quantity: number;
  grams: number;
  nutrition: NutritionValues;
} {
  const nameText = input.name.toLowerCase();
  const notesText = input.notes.toLowerCase();
  const isSauce = isSauceLike(nameText);
  const isSatay = !isSauce && /(satay|sate|skewer)/.test(nameText);
  if (!isSatay) {
    return {
      unit: input.unit,
      quantity: input.quantity,
      grams: input.grams,
      nutrition: input.nutrition
    };
  }

  const evidenceText = `${nameText} ${notesText}`;
  const explicitCount = extractSkewerCount(evidenceText);
  const satayCountFromPiece = input.unit === 'piece' ? Math.max(1, Math.min(30, Math.round(input.quantity))) : null;
  const hasFewSignal = /(few|a few|some skewers?|only a few|sedikit)/.test(evidenceText);
  const count = explicitCount ?? (hasFewSignal ? 3 : null) ?? satayCountFromPiece ?? 4;
  const conservativeCount = explicitCount ? count : Math.min(count, 6);

  // Satay piece output should stay in a realistic range (10-20g per skewer).
  if (input.unit === 'piece') {
    const minGrams = conservativeCount * 10;
    const maxGrams = conservativeCount * 20;
    const targetGrams = conservativeCount * 15;
    const normalizedGrams = input.grams < minGrams || input.grams > maxGrams ? targetGrams : input.grams;
    const ratio = input.grams > 0 ? normalizedGrams / input.grams : 1;
    return {
      unit: 'piece',
      quantity: conservativeCount,
      grams: round2(normalizedGrams),
      nutrition: scaleNutrition(input.nutrition, ratio)
    };
  }

  const tinyGramPortion = input.unit === 'gram' && (input.quantity <= 20 || input.grams <= 20);
  if (!tinyGramPortion) {
    return {
      unit: input.unit,
      quantity: input.quantity,
      grams: input.grams,
      nutrition: input.nutrition
    };
  }

  const targetGrams = Math.max(input.grams, conservativeCount * 15);
  const ratio = input.grams > 0 ? targetGrams / input.grams : 1;

  return {
    unit: 'piece',
    quantity: conservativeCount,
    grams: targetGrams,
    nutrition: scaleNutrition(input.nutrition, ratio)
  };
}

function adjustSaucePortion(input: {
  name: string;
  notes: string;
  unit: PortionUnitCode;
  quantity: number;
  grams: number;
  nutrition: NutritionValues;
}): {
  unit: PortionUnitCode;
  quantity: number;
  grams: number;
  nutrition: NutritionValues;
} {
  const nameText = input.name.toLowerCase();
  const notesText = input.notes.toLowerCase();
  const sauceLike = isSauceLike(nameText) || /(peanut sauce|bumbu kacang|sauce|sambal|kuah|gravy)/.test(notesText);
  if (!sauceLike) {
    return {
      unit: input.unit,
      quantity: input.quantity,
      grams: input.grams,
      nutrition: input.nutrition
    };
  }

  const notes = `${nameText} ${notesText}`;
  const sauceMinGrams = /(cover|coating|coated|whole plate|full plate|melimpah|banjir|lots of sauce|thick sauce)/.test(notes) ? 45 : 15;
  const grams = clampNumber(input.grams, Math.max(30, sauceMinGrams), sauceMinGrams, 150);
  const tablespoons = round2(Math.max(1, grams / 15));
  const ratio = input.grams > 0 ? grams / input.grams : 1;
  return {
    unit: 'tablespoon',
    quantity: tablespoons,
    grams,
    nutrition: scaleNutrition(input.nutrition, ratio)
  };
}

function adjustTinySolidPortion(input: {
  name: string;
  notes: string;
  unit: PortionUnitCode;
  quantity: number;
  grams: number;
  nutrition: NutritionValues;
}): {
  unit: PortionUnitCode;
  quantity: number;
  grams: number;
  nutrition: NutritionValues;
} {
  const text = `${input.name} ${input.notes}`.toLowerCase();
  if (isSauceLike(text) || isDrinkLike(text)) {
    return input;
  }

  const tinyGramPortion = input.unit === 'gram' && (input.quantity <= 20 || input.grams <= 20);
  if (!tinyGramPortion) {
    return input;
  }

  if (isNoodleLike(text)) {
    const targetGrams = Math.max(input.grams, 100);
    const ratio = input.grams > 0 ? targetGrams / input.grams : 1;
    return {
      unit: 'bowl',
      quantity: 1,
      grams: targetGrams,
      nutrition: scaleNutrition(input.nutrition, ratio)
    };
  }

  if (isRiceLike(text)) {
    const targetGrams = Math.max(input.grams, 150);
    const ratio = input.grams > 0 ? targetGrams / input.grams : 1;
    return {
      unit: 'bowl',
      quantity: 1,
      grams: targetGrams,
      nutrition: scaleNutrition(input.nutrition, ratio)
    };
  }

  if (isProteinPieceLike(text)) {
    const count = extractPieceCount(text) ?? (/(ayam|chicken|fried chicken)/.test(text) ? 6 : 3);
    const targetGrams = Math.max(input.grams, count * 25);
    const ratio = input.grams > 0 ? targetGrams / input.grams : 1;
    if (isSmallChunkLike(text) && /(ayam|chicken|fried chicken)/.test(text)) {
      return {
        unit: 'gram',
        quantity: targetGrams,
        grams: targetGrams,
        nutrition: scaleNutrition(input.nutrition, ratio)
      };
    }
    return {
      unit: 'piece',
      quantity: count,
      grams: targetGrams,
      nutrition: scaleNutrition(input.nutrition, ratio)
    };
  }

  const targetGrams = Math.max(input.grams, 40);
  const ratio = input.grams > 0 ? targetGrams / input.grams : 1;
  return {
    unit: 'gram',
    quantity: targetGrams,
    grams: targetGrams,
    nutrition: scaleNutrition(input.nutrition, ratio)
  };
}

function extractSkewerCount(text: string): number | null {
  const matched = text.match(/(\d{1,2})\s*(satay|sate|skewer|skewers|tusuk)/);
  let value: number | null = null;
  if (matched) {
    value = Number(matched[1]);
  } else {
    const wordMatched = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b\s*(satay|sate|skewer|skewers|tusuk)/);
    if (wordMatched) {
      value = NUMBER_WORDS[wordMatched[1]];
    }
  }
  if (value == null) return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(30, Math.max(1, Math.round(value)));
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};

function isSauceLike(text: string): boolean {
  return /(peanut sauce|bumbu kacang|sauce|saus|sambal|kuah|gravy|curry paste)/.test(text);
}

function isDrinkLike(text: string): boolean {
  return /(drink|beverage|juice|jus|teh|tea|coffee|kopi|milk|soda)/.test(text);
}

function isNoodleLike(text: string): boolean {
  return /(mie|mi goreng|noodle|bihun|kwetiau|ramen|pasta)/.test(text);
}

function isRiceLike(text: string): boolean {
  return /(nasi|rice)/.test(text);
}

function isProteinPieceLike(text: string): boolean {
  return /(ayam|chicken|daging|beef|steak|fish|ikan|udang|shrimp|telur|egg|sausage|sosis|bakso|meatball|nugget)/.test(text);
}

function isSmallChunkLike(text: string): boolean {
  return /(small pieces?|chunks?|chunked|bite-?sized|potongan kecil|irisan kecil|diced)/.test(text);
}

function extractPieceCount(text: string): number | null {
  const patterns = [
    /(\d{1,2})\s*(piece|pieces|pcs|potong|chunks?|small pieces)/,
    /(\d{1,2})\s*(ayam|chicken|telur|egg|nugget|skewer|satay|sate)/
  ];
  for (const pattern of patterns) {
    const matched = text.match(pattern);
    if (!matched) continue;
    const value = Number(matched[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    return Math.min(30, Math.max(1, Math.round(value)));
  }
  return null;
}

function scaleNutrition(base: NutritionValues, ratio: number): NutritionValues {
  const safeRatio = Math.max(1, Math.min(40, ratio));
  return {
    calories: round2(base.calories * safeRatio),
    protein: round2(base.protein * safeRatio),
    fat: round2(base.fat * safeRatio),
    carbs: round2(base.carbs * safeRatio),
    sugar: round2(base.sugar * safeRatio),
    fiber: round2(base.fiber * safeRatio),
    sodium: round2(base.sodium * safeRatio)
  };
}
