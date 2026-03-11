import type { ScanProcessResponse } from '@nutriscan/types';
import { apiFetch } from './client';

export interface EditableItemInput {
  name: string;
  normalizedKey?: string;
  unit: 'gram' | 'piece' | 'bowl' | 'plate' | 'cup' | 'tablespoon' | 'teaspoon';
  quantity: number;
}

export function processScan(imageUrl: string, scanId?: string) {
  return apiFetch<ScanProcessResponse>('/scan/process', {
    method: 'POST',
    body: JSON.stringify({ imageUrl, scanId })
  });
}

export function estimateScan(items: EditableItemInput[], scanId?: string) {
  return apiFetch<{
    items: Array<{
      name: string;
      normalizedKey: string;
      portion: { unit: EditableItemInput['unit']; quantity: number };
      gramsResolved: number;
      isEstimated: boolean;
      nutrition: { calories: number; protein: number; fat: number; carbs: number; sugar: number; fiber: number; sodium: number };
    }>;
    totals: { calories: number; protein: number; fat: number; carbs: number; sugar: number; fiber: number; sodium: number };
  }>('/scan/estimate', {
    method: 'POST',
    body: JSON.stringify({ scanId, items })
  });
}

export async function uploadImage(file: File) {
  const token = localStorage.getItem('nutriscan_token');
  const form = new FormData();
  form.append('image', file);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'}/scan/upload-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form
  });

  if (!res.ok) throw new Error('Unggah gambar gagal');
  return (await res.json()) as { scanId: string; imageUrl: string };
}
