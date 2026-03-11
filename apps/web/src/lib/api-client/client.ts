import { getToken } from '../auth/session';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? getToken() : null;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      }
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Gagal terhubung ke server. Pastikan API berjalan lalu coba lagi.');
    }
    throw error;
  }

  if (!res.ok) {
    const raw = await res.text();
    try {
      const parsed = JSON.parse(raw) as { message?: string | string[] };
      const message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
      throw new Error(message || 'Permintaan gagal');
    } catch {
      throw new Error(raw || 'Permintaan gagal');
    }
  }

  return (await res.json()) as T;
}
