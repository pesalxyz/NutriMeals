import { Injectable } from '@nestjs/common';
import type { FoodPrediction } from '@nutriscan/types';
import type { FoodRecognitionProvider, VisionAnalysisResult, VisionLabelCandidate } from './food-recognition.types';

const KEYWORD_LABELS: Array<{ keywords: string[]; label: string; normalizedKey: string; suggestedUnit: FoodPrediction['suggestedUnit']; confidence: number }> = [
  { keywords: ['nasi padang', 'padang', 'nasi campur', 'mixed rice'], label: 'Nasi Padang', normalizedKey: 'nasi_padang', suggestedUnit: 'plate', confidence: 0.78 },
  { keywords: ['nasi putih', 'white rice', 'steamed rice', 'plain rice'], label: 'Nasi Putih', normalizedKey: 'nasi_putih', suggestedUnit: 'bowl', confidence: 0.72 },
  { keywords: ['mie goreng', 'fried noodle', 'fried noodles', 'noodle', 'noodles', 'mie'], label: 'Mie Goreng', normalizedKey: 'mie_goreng', suggestedUnit: 'plate', confidence: 0.76 },
  { keywords: ['ayam goreng', 'fried chicken'], label: 'Ayam Goreng', normalizedKey: 'ayam_goreng', suggestedUnit: 'piece', confidence: 0.68 },
  { keywords: ['crispy chicken', 'chicken pieces', 'popcorn chicken', 'chicken bites'], label: 'Ayam Goreng', normalizedKey: 'ayam_goreng', suggestedUnit: 'piece', confidence: 0.66 },
  { keywords: ['rendang', 'ayam rendang'], label: 'Rendang', normalizedKey: 'rendang', suggestedUnit: 'piece', confidence: 0.7 },
  { keywords: ['telur rebus', 'boiled egg', 'hard boiled egg'], label: 'Telur Rebus', normalizedKey: 'telur_rebus', suggestedUnit: 'piece', confidence: 0.64 },
  { keywords: ['telur dadar', 'omelette', 'omelet'], label: 'Telur Dadar', normalizedKey: 'telur_dadar', suggestedUnit: 'piece', confidence: 0.68 },
  { keywords: ['telur balado', 'egg balado'], label: 'Telur Balado', normalizedKey: 'telur_balado', suggestedUnit: 'piece', confidence: 0.62 },
  { keywords: ['sosis', 'sausage', 'processed meat'], label: 'Sosis', normalizedKey: 'sosis', suggestedUnit: 'piece', confidence: 0.64 },
  { keywords: ['ketchup', 'saus tomat', 'tomato sauce'], label: 'Saus Tomat', normalizedKey: 'saus_tomat', suggestedUnit: 'tablespoon', confidence: 0.58 },
  { keywords: ['sambal', 'sambal merah', 'sambal hijau'], label: 'Sambal', normalizedKey: 'sambal_merah', suggestedUnit: 'tablespoon', confidence: 0.6 },
  { keywords: ['daun singkong', 'sayur', 'vegetable'], label: 'Daun Singkong', normalizedKey: 'daun_singkong', suggestedUnit: 'bowl', confidence: 0.58 },
  { keywords: ['gulai', 'curry sauce', 'kuah'], label: 'Kuah Gulai', normalizedKey: 'kuah_gulai', suggestedUnit: 'tablespoon', confidence: 0.57 },
  { keywords: ['tempe'], label: 'Tempe', normalizedKey: 'tempe', suggestedUnit: 'piece', confidence: 0.56 },
  { keywords: ['tahu'], label: 'Tahu', normalizedKey: 'tahu', suggestedUnit: 'piece', confidence: 0.56 },
  { keywords: ['perkedel'], label: 'Perkedel', normalizedKey: 'perkedel', suggestedUnit: 'piece', confidence: 0.56 },
  { keywords: ['kerupuk'], label: 'Kerupuk', normalizedKey: 'kerupuk', suggestedUnit: 'piece', confidence: 0.55 },
  { keywords: ['es teh'], label: 'Es Teh', normalizedKey: 'es_teh', suggestedUnit: 'cup', confidence: 0.62 },
  { keywords: ['jus jeruk', 'orange drink'], label: 'Jus Jeruk', normalizedKey: 'jus_jeruk', suggestedUnit: 'cup', confidence: 0.61 }
];

@Injectable()
export class HeuristicFoodRecognitionProvider implements FoodRecognitionProvider {
  name = 'heuristic_local';

  async analyze(_imagePath: string, imageUrl: string): Promise<VisionAnalysisResult> {
    const source = decodeURIComponent(imageUrl.toLowerCase());

    const matches = KEYWORD_LABELS.filter((entry) => entry.keywords.some((kw) => source.includes(kw)));

    if (matches.length) {
      const predictions: FoodPrediction[] = matches.map((entry) => ({
        name: entry.label,
        normalizedKey: entry.normalizedKey,
        confidence: entry.confidence,
        suggestedUnit: entry.suggestedUnit
      }));

      const rawCandidates: VisionLabelCandidate[] = matches.map((entry) => ({
        label: entry.label,
        confidence: entry.confidence
      }));

      const confidence = round2(Math.max(...predictions.map((p) => p.confidence)));
      const looksMixed = predictions.length > 2 || source.includes('padang') || source.includes('campur');

      return {
        isFoodCandidate: true,
        overallConfidence: confidence,
        predictions,
        rawCandidates,
        mealTypeHint: looksMixed ? 'mixed_plate' : 'single_item',
        reason: 'Keyword-assisted local fallback from image metadata. Confirm items manually if needed.'
      };
    }

    // Safe fallback: no random dish guessing.
    return {
      isFoodCandidate: true,
      overallConfidence: 0.38,
      predictions: [],
      rawCandidates: [],
      mealTypeHint: 'unclear',
      reason: 'Heuristic fallback could not reliably identify components from image metadata.'
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
