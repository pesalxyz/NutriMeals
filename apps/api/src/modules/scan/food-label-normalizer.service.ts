import { Injectable } from '@nestjs/common';
import type { PortionUnitCode } from '@nutriscan/types';

export interface NormalizedFoodCandidate {
  label: string;
  normalizedKey: string;
  displayName: string;
  confidence: number;
  category: 'rice' | 'protein' | 'egg' | 'sambal' | 'vegetable' | 'sauce' | 'side' | 'drink' | 'other';
  suggestedUnit: PortionUnitCode;
}

interface VocabularyItem {
  normalizedKey: string;
  displayName: string;
  category: NormalizedFoodCandidate['category'];
  suggestedUnit: PortionUnitCode;
  keywords: string[];
}

const VOCABULARY: VocabularyItem[] = [
  { normalizedKey: 'nasi_padang', displayName: 'Nasi Padang', category: 'rice', suggestedUnit: 'plate', keywords: ['nasi padang', 'padang rice'] },
  { normalizedKey: 'nasi_campur', displayName: 'Nasi Campur', category: 'rice', suggestedUnit: 'plate', keywords: ['nasi campur', 'mixed rice'] },
  { normalizedKey: 'nasi_putih', displayName: 'Nasi Putih', category: 'rice', suggestedUnit: 'bowl', keywords: ['nasi putih', 'white rice', 'steamed rice', 'plain rice'] },
  { normalizedKey: 'mie_goreng', displayName: 'Mie Goreng', category: 'rice', suggestedUnit: 'plate', keywords: ['mie goreng', 'fried noodle', 'fried noodles', 'noodle', 'noodles', 'mie'] },
  { normalizedKey: 'ayam_goreng', displayName: 'Ayam Goreng', category: 'protein', suggestedUnit: 'piece', keywords: ['ayam goreng', 'fried chicken'] },
  { normalizedKey: 'ayam_goreng', displayName: 'Ayam Goreng', category: 'protein', suggestedUnit: 'piece', keywords: ['crispy chicken', 'chicken pieces', 'popcorn chicken', 'chicken bites'] },
  { normalizedKey: 'ayam_bakar', displayName: 'Ayam Bakar', category: 'protein', suggestedUnit: 'piece', keywords: ['ayam bakar', 'grilled chicken'] },
  { normalizedKey: 'ayam_rendang', displayName: 'Ayam Rendang', category: 'protein', suggestedUnit: 'piece', keywords: ['ayam rendang'] },
  { normalizedKey: 'rendang', displayName: 'Rendang', category: 'protein', suggestedUnit: 'piece', keywords: ['rendang'] },
  { normalizedKey: 'gulai_ayam', displayName: 'Gulai Ayam', category: 'sauce', suggestedUnit: 'tablespoon', keywords: ['gulai ayam', 'chicken curry'] },
  { normalizedKey: 'telur_rebus', displayName: 'Telur Rebus', category: 'egg', suggestedUnit: 'piece', keywords: ['telur rebus', 'boiled egg', 'hard boiled egg', 'boiled egg pieces'] },
  { normalizedKey: 'telur_dadar', displayName: 'Telur Dadar', category: 'egg', suggestedUnit: 'piece', keywords: ['telur dadar', 'omelette', 'omelet'] },
  { normalizedKey: 'telur_balado', displayName: 'Telur Balado', category: 'egg', suggestedUnit: 'piece', keywords: ['telur balado', 'egg balado'] },
  { normalizedKey: 'sosis', displayName: 'Sosis', category: 'protein', suggestedUnit: 'piece', keywords: ['sosis', 'sausage', 'processed meat'] },
  { normalizedKey: 'saus_tomat', displayName: 'Saus Tomat', category: 'sauce', suggestedUnit: 'tablespoon', keywords: ['saus tomat', 'ketchup', 'tomato sauce'] },
  { normalizedKey: 'sambal_merah', displayName: 'Sambal Merah', category: 'sambal', suggestedUnit: 'tablespoon', keywords: ['sambal merah', 'sambal'] },
  { normalizedKey: 'sambal_hijau', displayName: 'Sambal Hijau', category: 'sambal', suggestedUnit: 'tablespoon', keywords: ['sambal hijau'] },
  { normalizedKey: 'daun_singkong', displayName: 'Daun Singkong', category: 'vegetable', suggestedUnit: 'bowl', keywords: ['daun singkong', 'cassava leaf'] },
  { normalizedKey: 'sayur_hijau', displayName: 'Sayur Hijau', category: 'vegetable', suggestedUnit: 'bowl', keywords: ['sayur hijau', 'green vegetable', 'vegetable'] },
  { normalizedKey: 'kuah_gulai', displayName: 'Kuah Gulai', category: 'sauce', suggestedUnit: 'tablespoon', keywords: ['kuah gulai', 'gulai sauce', 'curry sauce'] },
  { normalizedKey: 'perkedel', displayName: 'Perkedel', category: 'side', suggestedUnit: 'piece', keywords: ['perkedel'] },
  { normalizedKey: 'tempe', displayName: 'Tempe', category: 'side', suggestedUnit: 'piece', keywords: ['tempe', 'tempeh'] },
  { normalizedKey: 'tahu', displayName: 'Tahu', category: 'side', suggestedUnit: 'piece', keywords: ['tahu', 'tofu'] },
  { normalizedKey: 'kerupuk', displayName: 'Kerupuk', category: 'side', suggestedUnit: 'piece', keywords: ['kerupuk', 'cracker'] },
  { normalizedKey: 'es_teh', displayName: 'Es Teh', category: 'drink', suggestedUnit: 'cup', keywords: ['es teh', 'iced tea'] },
  { normalizedKey: 'jus_jeruk', displayName: 'Jus Jeruk', category: 'drink', suggestedUnit: 'cup', keywords: ['jus jeruk', 'orange drink', 'orange juice'] },
  { normalizedKey: 'burger', displayName: 'Burger', category: 'other', suggestedUnit: 'piece', keywords: ['burger'] },
  { normalizedKey: 'pizza', displayName: 'Pizza', category: 'other', suggestedUnit: 'piece', keywords: ['pizza'] }
];

@Injectable()
export class FoodLabelNormalizer {
  normalize(labels: Array<{ label: string; confidence: number }>): NormalizedFoodCandidate[] {
    const output: NormalizedFoodCandidate[] = [];

    for (const label of labels) {
      const normalized = this.matchVocabulary(label.label);
      if (!normalized) continue;

      output.push({
        label: label.label,
        normalizedKey: normalized.normalizedKey,
        displayName: normalized.displayName,
        confidence: clamp(label.confidence),
        category: normalized.category,
        suggestedUnit: normalized.suggestedUnit
      });
    }

    return dedupeByKey(output);
  }

  private matchVocabulary(text: string): VocabularyItem | null {
    const lower = text.toLowerCase();
    for (const item of VOCABULARY) {
      if (item.keywords.some((keyword) => lower.includes(keyword))) {
        return item;
      }
    }
    return null;
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function dedupeByKey(input: NormalizedFoodCandidate[]): NormalizedFoodCandidate[] {
  const map = new Map<string, NormalizedFoodCandidate>();

  for (const candidate of input) {
    const existing = map.get(candidate.normalizedKey);
    if (!existing || existing.confidence < candidate.confidence) {
      map.set(candidate.normalizedKey, candidate);
    }
  }

  return [...map.values()];
}
