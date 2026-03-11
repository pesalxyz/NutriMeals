import { Inject, Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { MealType, NutritionValues, PortionUnitCode } from '@nutriscan/types';
import type { VisionDescriptionResult } from './vision-description.service';

interface InferenceResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface InferredComponent {
  name: string;
  normalizedKey?: string;
  portion: {
    amount: number;
    unit: PortionUnitCode;
  };
  estimatedWeightGrams: number;
  confidence: number;
  nutrition: NutritionValues;
  notes?: string;
}

export interface NutritionInferenceResult {
  mealType: MealType;
  summary: string;
  components: InferredComponent[];
  totalNutrition: NutritionValues;
  uncertaintyNotes: string[];
}

@Injectable()
export class OpenAINutritionInferenceService {
  private readonly logger = new Logger(OpenAINutritionInferenceService.name);

  async infer(input: VisionDescriptionResult, imagePath?: string): Promise<NutritionInferenceResult | null> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.OPENAI_NUTRITION_MODEL?.trim() || process.env.OPENAI_VISION_MODEL?.trim() || 'gpt-4.1-mini';
    const prompt = buildPrompt(input);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Anda adalah mesin inferensi nutrisi konservatif berbahasa Indonesia. Balas JSON valid saja. Jangan mengarang makanan yang tidak didukung deskripsi.'
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        this.logger.warn(`Nutrition inference failed with status ${response.status}`);
        return null;
      }

      const payload = (await response.json()) as InferenceResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) return null;

      const parsed = tryParseJson(content);
      if (!parsed || typeof parsed !== 'object') return null;

      const parsedRecord = parsed as Record<string, unknown>;
      const count = Array.isArray(parsedRecord.components) ? parsedRecord.components.length : 0;
      this.logger.log(`Nutrition inference returned ${count} components`);
      const base = parsed as NutritionInferenceResult;
      return await this.refineSatayCount(base, imagePath, apiKey);
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'OpenAI nutrition inference error');
      return null;
    }
  }

  private async refineSatayCount(
    result: NutritionInferenceResult,
    imagePath: string | undefined,
    apiKey: string
  ): Promise<NutritionInferenceResult> {
    if (!imagePath || !Array.isArray(result.components) || result.components.length === 0) return result;

    const satayIndexes = result.components
      .map((component, index) => ({ component, index }))
      .filter(({ component }) => isSatayLike(component.name, component.normalizedKey));
    if (!satayIndexes.length) return result;

    const countResult = await this.countVisibleSataySkewers(imagePath, apiKey);
    if (!countResult || countResult.confidence < 0.6) return result;
    if (!Number.isFinite(countResult.visibleSkewerCount) || countResult.visibleSkewerCount < 1 || countResult.visibleSkewerCount > 30) return result;

    const next = structuredClone(result);
    for (const { index } of satayIndexes) {
      const component = next.components[index];
      const oldGrams = Number.isFinite(component.estimatedWeightGrams) && component.estimatedWeightGrams > 0 ? component.estimatedWeightGrams : 0;
      const newCount = Math.round(countResult.visibleSkewerCount);
      const newGrams = round2(newCount * 15);
      const ratio = oldGrams > 0 ? newGrams / oldGrams : 1;

      component.portion = {
        amount: newCount,
        unit: 'piece'
      };
      component.estimatedWeightGrams = newGrams;
      component.nutrition = scaleNutrition(component.nutrition, ratio);
      component.notes = [component.notes, `Hitung visual AI: sekitar ${newCount} tusuk sate terlihat.`].filter(Boolean).join(' ');
    }

    next.totalNutrition = sumNutrition(next.components.map((component) => component.nutrition));
    next.uncertaintyNotes = dedupeNotes([
      ...(next.uncertaintyNotes ?? []),
      'Jumlah tusuk sate adalah estimasi visual dari foto dan bisa berubah jika tertutup objek lain.'
    ]);
    return next;
  }

  private async countVisibleSataySkewers(
    imagePath: string,
    apiKey: string
  ): Promise<{ visibleSkewerCount: number; confidence: number } | null> {
    const imageBuffer = await readFile(imagePath);
    const dataUrl = `data:${mimeFromExtension(imagePath)};base64,${imageBuffer.toString('base64')}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL?.trim() || 'gpt-4.1-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Hitung jumlah tusuk sate yang terlihat pada gambar ini. Balas JSON valid saja: { "visibleSkewerCount": number, "confidence": number }. Hitung tusuk yang terlihat jelas maupun sebagian terlihat jika masih terhubung ke daging sate. Jangan menurunkan hitungan secara konservatif berlebihan.'
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl }
              }
            ]
          }
        ]
      })
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as InferenceResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    const parsed = tryParseJson(content);
    if (!parsed || typeof parsed !== 'object') return null;
    const rec = parsed as Record<string, unknown>;
    const visibleSkewerCount = typeof rec.visibleSkewerCount === 'number' ? rec.visibleSkewerCount : 0;
    const confidence = typeof rec.confidence === 'number' ? rec.confidence : 0;
    return { visibleSkewerCount, confidence };
  }
}

function buildPrompt(input: VisionDescriptionResult): string {
  const candidateNames = [
    ...input.analysis.predictions.map((prediction) => prediction.name),
    ...(input.analysis.rawCandidates ?? []).map((candidate) => candidate.label)
  ]
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 12);

  return [
    'Baca deskripsi makanan ini lalu inferensikan estimasi nutrisi terstruktur.',
    'Gunakan penalaran konservatif di level komponen dan gunakan Bahasa Indonesia.',
    'Untuk makanan campur, inferensikan komponen hanya jika didukung deskripsi/kandidat.',
    'Aturan realisme porsi:',
    '- Jangan keluarkan porsi utama padat yang sangat kecil seperti 1-5 gram.',
    '- Untuk mie yang terlihat jelas, default 80-180g dan pakai satuan mangkuk/piring kecuali benar-benar kecil.',
    '- Untuk ayam goreng potongan, gunakan satuan potong dengan hitungan wajar (mis. 4-10 potong) dan gram yang realistis.',
    '- Untuk sate, hitung tusuk yang terlihat dan set jumlah piece sesuai hitungan visual. Pakai 10-20g per tusuk (default 15g).',
    '- Untuk saus/kondimen (bumbu kacang, sambal, kuah), JANGAN pakai satuan piece. Gunakan sendok makan/gram.',
    '- Hanya gunakan < 15g jika memang jejak saus sangat sedikit.',
    'Utamakan komponen Indonesia jika didukung: nasi putih, nasi padang, nasi campur, ayam goreng, ayam gulai, rendang, telur rebus, telur balado, telur dadar, sambal merah/hijau, daun singkong, sayur hijau, kuah gulai, kerupuk, tempe, tahu, es teh, jus jeruk.',
    'Hindari makanan barat acak kecuali ada bukti kuat.',
    'Kembalikan JSON valid saja dengan bentuk:',
    '{ mealType, summary, components[], totalNutrition, uncertaintyNotes[] }',
    'Setiap komponen wajib berisi: name, normalizedKey, portion{amount,unit}, estimatedWeightGrams, confidence, nutrition{calories,protein,fat,carbs,sugar,fiber,sodium}, notes.',
    `Hint tipe makanan: ${input.mealType}`,
    `Keyakinan makanan: ${input.confidence}`,
    `Deskripsi: ${input.description}`,
    `Label kandidat: ${candidateNames.join(', ') || 'tidak ada'}`
  ].join('\n');
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isSatayLike(name: string, normalizedKey?: string): boolean {
  const n = `${name} ${normalizedKey ?? ''}`.toLowerCase();
  return /(satay|sate|skewer)/.test(n);
}

function scaleNutrition(base: NutritionValues, ratio: number): NutritionValues {
  const safeRatio = Math.max(0.25, Math.min(8, ratio));
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function dedupeNotes(notes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const note of notes) {
    if (typeof note !== 'string') continue;
    const trimmed = note.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.slice(0, 6);
}

function mimeFromExtension(pathname: string): string {
  const ext = extname(pathname).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}
