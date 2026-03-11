import { apiFetch } from './client';

export function getDailySummary(date?: string) {
  const query = date ? `?date=${date}` : '';
  return apiFetch<{
    date: string;
    totals: { calories: number; protein: number; carbs: number; fat: number; sugar: number; fiber: number; sodium: number };
    targets: { calories: number; protein: number; carbs: number; fat: number };
    progress: { calories: number; protein: number; carbs: number; fat: number };
    meals: Array<{ id: string; category: string; eatenAt: string; imageUrl?: string }>;
  }>(`/dashboard/daily-summary${query}`);
}
