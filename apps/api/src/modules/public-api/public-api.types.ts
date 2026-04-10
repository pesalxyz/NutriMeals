import type { ApiKeyStatus } from '@prisma/client';

export interface PublicApiKeyContext {
  id: string;
  ownerId: string;
  name: string;
  status: ApiKeyStatus;
}

export interface PublicApiAuthResult {
  ok: boolean;
  statusCode: number;
  message?: string;
  key?: PublicApiKeyContext;
}
