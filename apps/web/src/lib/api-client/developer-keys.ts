import { apiFetch } from './client';

export type DeveloperKeyStatus = 'active' | 'inactive';

export interface DeveloperKey {
  id: string;
  name: string;
  status: DeveloperKeyStatus;
  usageCount: number;
  createdAt: string;
  lastUsedAt: string | null;
  keyPreview: string;
}

export interface CreatedDeveloperKey {
  id: string;
  name: string;
  key: string;
  status: DeveloperKeyStatus;
  usageCount: number;
  createdAt: string;
}

export function createDeveloperKey(name: string) {
  return apiFetch<CreatedDeveloperKey>('/api/developer/keys', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export function listDeveloperKeys() {
  return apiFetch<DeveloperKey[]>('/api/developer/keys', {
    method: 'GET'
  });
}

export function updateDeveloperKeyStatus(id: string, status: DeveloperKeyStatus) {
  return apiFetch<{ id: string; status: DeveloperKeyStatus }>(`/api/developer/keys/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}
