import type { GoogleAuthRequest } from '../contracts';
import { apiFetch } from './client';

export function loginWithGoogle(payload: GoogleAuthRequest) {
  return apiFetch<{ accessToken: string; user: { id: string; email: string } }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
