import type { ProfileInput } from '@nutriscan/types';
import { apiFetch } from './client';

export type ProfilePayload = ProfileInput & {
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
};

export function getProfile() {
  return apiFetch<{ profile: ProfileInput | null; goal: { calories: number; protein: number; carbs: number; fat: number } | null }>(
    '/profile'
  );
}

export function upsertProfile(payload: ProfilePayload) {
  return apiFetch('/profile', { method: 'PUT', body: JSON.stringify(payload) });
}
