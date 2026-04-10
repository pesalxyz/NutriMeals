import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const API_KEY_PREFIX = 'nm_live';

export function generatePublicApiKey(): { plainKey: string; keyPrefix: string; keyHash: string } {
  const identifier = randomBytes(6).toString('hex');
  const secret = randomBytes(24).toString('base64url');
  const plainKey = `${API_KEY_PREFIX}_${identifier}_${secret}`;

  return {
    plainKey,
    keyPrefix: `${API_KEY_PREFIX}_${identifier}`,
    keyHash: hashApiKey(plainKey)
  };
}

export function hashApiKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
