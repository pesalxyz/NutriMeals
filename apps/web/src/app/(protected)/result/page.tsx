'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppNav } from '../../../components/nav';
import { estimateScan } from '../../../lib/api-client/scan';
import type { EditableItemInput } from '../../../lib/api-client/scan';
import { saveMeal } from '../../../lib/api-client/meals';
import type { ScanProcessResponse } from '../../../lib/contracts';
import { Card } from '../../../components/ui/card';
import { SectionHeader } from '../../../components/ui/section-header';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';

type Editable = {
  name: string;
  normalizedKey?: string;
  unit: 'gram' | 'piece' | 'bowl' | 'plate' | 'cup' | 'tablespoon' | 'teaspoon';
  quantity: number;
  confidence?: number;
};

const UNITS: Editable['unit'][] = ['gram', 'piece', 'bowl', 'plate', 'cup', 'tablespoon', 'teaspoon'];

export default function ResultPage() {
  const router = useRouter();
  const [scanId, setScanId] = useState<string | undefined>();
  const [imageUrl, setImageUrl] = useState('');
  const [items, setItems] = useState<Editable[]>([]);
  const [category, setCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [totals, setTotals] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [estimatedItems, setEstimatedItems] = useState<Array<{ isEstimated: boolean; gramsResolved: number; nutrition: { calories: number; protein: number; carbs: number; fat: number; sugar: number; fiber: number; sodium: number } }>>([]);
  const [mode, setMode] = useState<'success' | 'uncertain'>('success');
  const [message, setMessage] = useState('');
  const [mealType, setMealType] = useState<ScanProcessResponse['mealType']>('unclear');
  const [notes, setNotes] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [uncertaintyNotes, setUncertaintyNotes] = useState<string[]>([]);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const sugarTotal = estimatedItems.reduce((sum, item) => sum + item.nutrition.sugar, 0);
  const displayNotes = dedupeLines([description, ...notes]);

  useEffect(() => {
    const raw = sessionStorage.getItem('nutriscan_scan_result');
    if (!raw) {
      router.push('/scan');
      return;
    }

    const parsed = JSON.parse(raw) as ScanProcessResponse;
    if (parsed.status === 'no_food_detected') {
      router.push('/scan');
      return;
    }

    setScanId(parsed.scanId);
    setImageUrl(parsed.imageUrl);
    setMode(parsed.status);
    setMessage(parsed.message);
    setMealType(parsed.mealType);
    setNotes(parsed.notes);
    setDescription(parsed.description ?? '');
    setUncertaintyNotes(parsed.uncertaintyNotes ?? []);

    if (parsed.status === 'success') {
      setItems(parsed.items.map((p) => ({ name: p.name, normalizedKey: p.normalizedKey, quantity: p.suggestedQuantity ?? 1, unit: p.suggestedUnit, confidence: p.confidence })));
      setTotals({
        calories: parsed.totalNutrition.calories,
        protein: parsed.totalNutrition.protein,
        carbs: parsed.totalNutrition.carbs,
        fat: parsed.totalNutrition.fat
      });
    } else {
      setItems(parsed.suggestions.map((p) => ({ name: p.name, normalizedKey: p.normalizedKey, quantity: p.suggestedQuantity ?? 1, unit: p.suggestedUnit, confidence: p.confidence })));
      if (parsed.estimatedTotalNutrition) {
        setTotals({
          calories: parsed.estimatedTotalNutrition.calories,
          protein: parsed.estimatedTotalNutrition.protein,
          carbs: parsed.estimatedTotalNutrition.carbs,
          fat: parsed.estimatedTotalNutrition.fat
        });
      }
    }
  }, [router]);

  async function estimate() {
    const cleaned = normalizeItems(items);
    if (!cleaned.length) {
      setActionError('Tambahkan minimal satu komponen valid sebelum estimasi.');
      return;
    }

    setEstimateLoading(true);
    setActionError('');
    try {
      const result = await estimateScan(cleaned, scanId);
      setEstimatedItems(result.items.map((x) => ({ isEstimated: x.isEstimated, gramsResolved: x.gramsResolved, nutrition: x.nutrition })));
      setTotals({
        calories: result.totals.calories,
        protein: result.totals.protein,
        carbs: result.totals.carbs,
        fat: result.totals.fat
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Estimasi gagal diproses. Coba lagi.');
    } finally {
      setEstimateLoading(false);
    }
  }

  async function save() {
    const cleaned = normalizeItems(items);
    if (!cleaned.length) {
      setActionError('Tambahkan minimal satu komponen valid sebelum menyimpan.');
      return;
    }

    setSaveLoading(true);
    setActionError('');
    try {
      const result = await estimateScan(cleaned, scanId);
      await saveMeal({
        scanId,
        category,
        eatenAt: new Date().toISOString(),
        imageUrl,
        items: result.items.map((item) => ({
          name: item.name,
          normalizedKey: item.normalizedKey,
          unit: item.portion.unit,
          quantity: item.portion.quantity,
          gramsResolved: item.gramsResolved,
          isEstimated: item.isEstimated,
          ...item.nutrition
        }))
      });
      router.push('/dashboard');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Simpan makanan gagal. Coba lagi.');
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <main className="stack">
      <AppNav />
      <Card className="hero-card">
        <SectionHeader title="Hasil scan AI" subtitle="Nutrisi diestimasi dari komponen makanan yang terlihat. Tinjau sebelum disimpan." />
      </Card>

      {imageUrl ? (
        <Card className="glass">
          <img src={imageUrl} alt="pratinjau makanan" className="scan-preview-img" />
        </Card>
      ) : null}

      <Card className="row glass">
        <div className="meta-row">
          <p className="list-card__title m-0">{mode === 'uncertain' ? 'Kemungkinan makanan terdeteksi' : 'Makanan terdeteksi'}</p>
          <Badge tone={mode === 'uncertain' ? 'warning' : 'success'}>{mealTypeLabel(mealType)}</Badge>
        </div>
        <p className="small m-0">{message}</p>
        {displayNotes.map((note, index) => (
          <p key={`${note}-${index}`} className="small m-0">{note}</p>
        ))}
        {uncertaintyNotes.map((note, index) => (
          <p key={`u-${note}-${index}`} className="small m-0">Catatan: {note}</p>
        ))}
        <p className="small note-warn">
          Catatan: Jika hasil scanner kurang akurat, coba scan ulang untuk hasil yang lebih baik.
        </p>
      </Card>

      {totals && (
        <Card className="glass">
          <p className="small m-0">Total kalori</p>
          <p className="calorie-value">{Math.round(totals.calories)} kcal</p>
          <div className="kpi-grid">
            <div className="kpi"><h4>Protein</h4><p>{Math.round(totals.protein)}g</p></div>
            <div className="kpi"><h4>Karbo</h4><p>{Math.round(totals.carbs)}g</p></div>
            <div className="kpi"><h4>Lemak</h4><p>{Math.round(totals.fat)}g</p></div>
            <div className="kpi"><h4>Gula</h4><p>{Math.round(sugarTotal)}g</p></div>
          </div>
        </Card>
      )}

      <Card className="row glass">
        <h3 className="section-title-sm m-0">Komponen makanan</h3>
        {items.length === 0 ? <EmptyState title="Komponen belum ada" description="Tambahkan minimal satu komponen untuk estimasi nutrisi." /> : null}
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="surface comp-card">
            <div className="comp-head">
              <input className="input" value={item.name} onChange={(e) => setItems((cur) => cur.map((it, i) => i === index ? { ...it, name: e.target.value } : it))} />
              <button
                type="button"
                className="small remove-btn"
                onClick={() => setItems((cur) => cur.filter((_, i) => i !== index))}
              >
                Hapus
              </button>
            </div>
            <div className="comp-input-row">
              <input className="input" type="number" value={item.quantity} onChange={(e) => setItems((cur) => cur.map((it, i) => i === index ? { ...it, quantity: Number(e.target.value) } : it))} />
              <select className="select" value={item.unit} onChange={(e) => setItems((cur) => cur.map((it, i) => i === index ? { ...it, unit: e.target.value as Editable['unit'] } : it))}>
                {UNITS.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}
              </select>
            </div>
            <div className="comp-meta-row">
              <Badge>Keyakinan: {item.confidence ? `${Math.round(item.confidence * 100)}%` : 'manual'}</Badge>
              {estimatedItems[index] ? <Badge>{estimatedItems[index].gramsResolved}g • {estimatedItems[index].isEstimated ? 'estimasi' : 'tepat'}</Badge> : null}
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setItems((cur) => [...cur, { name: '', unit: 'gram', quantity: 100 }])}>+ Tambah item</Button>

        <select className="select" value={category} onChange={(e) => setCategory(e.target.value as 'breakfast' | 'lunch' | 'dinner' | 'snack')}>
          <option value="breakfast">Sarapan</option>
          <option value="lunch">Makan siang</option>
          <option value="dinner">Makan malam</option>
          <option value="snack">Camilan</option>
        </select>
        <div className="action-row">
          <Button variant="secondary" className="fill" onClick={estimate} disabled={!items.length || estimateLoading || saveLoading}>
            {estimateLoading ? 'Menghitung...' : 'Estimasi'}
          </Button>
          <Button className="fill cta-button" onClick={save} disabled={!items.length || estimateLoading || saveLoading}>
            {saveLoading ? 'Menyimpan...' : 'Simpan makanan'}
          </Button>
        </div>
        {actionError ? <p className="error m-0">{actionError}</p> : null}
      </Card>
    </main>
  );
}

function unitLabel(unit: Editable['unit']): string {
  const map: Record<Editable['unit'], string> = {
    gram: 'gram',
    piece: 'potong',
    bowl: 'mangkuk',
    plate: 'piring',
    cup: 'cangkir',
    tablespoon: 'sendok makan',
    teaspoon: 'sendok teh'
  };
  return map[unit];
}

function mealTypeLabel(value: ScanProcessResponse['mealType']): string {
  const map: Record<ScanProcessResponse['mealType'], string> = {
    mixed_plate: 'piring campur',
    single_item: 'satu item',
    packaged_food: 'makanan kemasan',
    drink: 'minuman',
    unclear: 'belum jelas'
  };
  return map[value] ?? value.replace('_', ' ');
}

function dedupeLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const next = line?.trim();
    if (!next) continue;
    const lower = next.toLowerCase();
    const duplicate = out.some((existing) => {
      const current = existing.toLowerCase();
      return current === lower || current.includes(lower) || lower.includes(current);
    });
    if (!duplicate) out.push(next);
  }
  return out.slice(0, 6);
}

function normalizeItems(items: Editable[]): EditableItemInput[] {
  return items
    .map((item) => ({
      name: item.name.trim(),
      normalizedKey: item.normalizedKey,
      unit: item.unit,
      quantity: Number(item.quantity)
    }))
    .filter((item) => item.name.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0);
}
