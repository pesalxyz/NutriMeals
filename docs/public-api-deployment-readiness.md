# Public API Deployment Readiness (Railway)

Dokumen ini fokus ke kesiapan production untuk fitur Public API NutriMeals.

## 1) Ringkasan endpoint

- Public analyze endpoint: `POST /api/public/v1/analyze-food`
- Developer key management (butuh JWT user):
  - `POST /api/developer/keys`
  - `GET /api/developer/keys`
  - `PATCH /api/developer/keys/:id/status`

## 2) Env vars wajib di Railway (API service)

Pastikan variabel berikut ada:

```env
NODE_ENV=production
PORT=<disediakan Railway otomatis>
DATABASE_URL=<Railway Postgres URL>
JWT_SECRET=<secret kuat, minimal 32 karakter>
JWT_EXPIRES_IN=1d
GOOGLE_OAUTH_CLIENT_IDS=<web_client_id,android_client_id,expo_client_id>
AI_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=<secret key>
LLM_VISION_MODEL=gpt-4.1-mini
LLM_NUTRITION_MODEL=gpt-4.1-mini
PUBLIC_API_RATE_LIMIT_PER_MINUTE=10
LOCAL_UPLOAD_DIR=apps/api/uploads
```

Catatan:
- `API_PORT` opsional; di Railway sebaiknya gunakan `PORT`.
- `OPENAI_*` masih didukung sebagai fallback, tapi gunakan `LLM_*` untuk konfigurasi utama.
- `LOCAL_UPLOAD_DIR` pada Railway bersifat ephemeral storage (aman untuk demo, tidak untuk arsip jangka panjang).

## 3) Build & start command (Railway)

Contoh konfigurasi aman:

- **Install Command**
```bash
corepack enable && pnpm install --frozen-lockfile
```

- **Build Command**
```bash
pnpm --filter @nutriscan/api prisma generate && pnpm --filter @nutriscan/api build
```

- **Start Command**
```bash
pnpm --filter @nutriscan/api start
```

## 4) Production migration readiness

Schema public API menambah:
- enum `ApiKeyStatus`
- table `ApiKey`
- table `ApiUsageLog`

Migration file:
- `apps/api/prisma/migrations/20260409103000_public_api_keys/migration.sql`

Jalankan sekali per environment production:

```bash
pnpm --filter @nutriscan/api prisma generate
pnpm --filter @nutriscan/api prisma migrate deploy
```

Jika menjalankan via Railway shell/CLI, pastikan command dieksekusi di repo root.

## 5) Risiko dan mitigasi

1. **Tabel belum termigrasi**
- Gejala: endpoint key/public API gagal query Prisma.
- Mitigasi: jalankan `prisma migrate deploy` sebelum test endpoint.

2. **LLM key tidak terpasang**
- Gejala: analisis selalu gagal/uncertain/no-food.
- Mitigasi: cek `LLM_API_KEY`, `AI_PROVIDER`, dan model env.

3. **Upload terlalu besar**
- Sekarang sudah dibatasi 5MB (multer + validasi).
- Response: `400` dengan pesan ukuran file.

4. **Rate limit per instance**
- Implementasi saat ini in-memory per container.
- Untuk MVP kampus cukup; untuk production skala besar gunakan Redis/distributed limiter.

## 6) Hardcoded local assumptions check

- Tidak ada URL localhost hardcoded di public controller.
- Image dianalisis dari file lokal hasil upload (`StorageService.saveImage`) lalu diproses backend.
- OpenAI key tetap server-side (tidak pernah dikirim ke client).

## 7) Quick go-live sequence

1. Push code terbaru ke branch deploy.
2. Set env vars Railway API service.
3. Redeploy API service.
4. Jalankan migration deploy.
5. Test health route sederhana (`/auth/me` pakai token, atau endpoint lain existing).
6. Test endpoint developer key + public analyze-food via Postman.
