const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000';

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });
  if (!res.ok) {
    const raw = await res.text();
    try {
      const parsed = JSON.parse(raw) as { message?: string | string[] };
      const message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
      throw new Error(message || 'Request failed');
    } catch {
      throw new Error(raw || 'Request failed');
    }
  }
  return (await res.json()) as T;
}

export { API_BASE_URL };
