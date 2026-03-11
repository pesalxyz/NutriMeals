import { apiFetch } from './client';

export function saveMeal(payload: unknown) {
  return apiFetch('/meals', { method: 'POST', body: JSON.stringify(payload) });
}

export function listHistory(date?: string) {
  const query = date ? `?date=${date}` : '';
  return apiFetch<Array<{ id: string; category: string; eatenAt: string; snapshot: { calories: number } }>>(`/history${query}`);
}

export function getMeal(id: string) {
  return apiFetch<{
    id: string;
    category: string;
    eatenAt: string;
    items: Array<{ customName: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }>;
    snapshot: { calories: number; protein: number; carbs: number; fat: number; sugar: number; fiber: number; sodium: number };
  }>(`/meals/${id}`);
}
