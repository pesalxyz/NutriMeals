# NutriMeals (MVP)

NutriMeals adalah aplikasi **AI-assisted nutrition scanner** dengan backend bersama untuk web (iOS/mobile browser), Android (Expo), dan Telegram bot.

## Product positioning
NutriMeals memberikan **estimasi nutrisi berbasis AI** (bukan diagnosis medis).

## Monorepo structure

- `apps/api`: NestJS REST API + Prisma + PostgreSQL
- `apps/web`: Next.js mobile-first web app
- `apps/mobile`: Expo React Native app
- `apps/telegram-bot`: Telegram bot (konsumsi Public API NutriMeals)
- `packages/types`: shared TypeScript contracts
- `packages/domain`: shared nutrition + portion logic
- `packages/config`: shared config template

## Architecture overview

- Auth: Google Sign-In (ID token) + JWT
- Food recognition: `FoodRecognitionService` (provider adapter)
  - Provider bisa `heuristic`, `openai`, atau `mock_fixed`
  - `AI_PROVIDER=auto` memilih OpenAI jika API key tersedia, fallback ke heuristic
- Nutrition inference: `OpenAINutritionInferenceService` + formatter guardrails
- Storage: `StorageService` abstraction (default local filesystem)
- Public API: API key system internal (`x-api-key`) untuk endpoint analyze-food

## Tech stack

- Backend: NestJS + Prisma + PostgreSQL
- Web: Next.js App Router + TypeScript
- Mobile: Expo + TypeScript
- Shared logic: workspace packages (`@nutriscan/types`, `@nutriscan/domain`)

## Environment variables

Gunakan contoh dari:
- Root: [`.env.example`](.env.example)
- API: [`apps/api/.env.example`](apps/api/.env.example)

### Variabel penting backend

- `NODE_ENV`
- `API_PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `WEB_URL`
- `GOOGLE_OAUTH_CLIENT_IDS` (comma-separated)
- `STORAGE_DRIVER`
- `LOCAL_UPLOAD_DIR`
- `AI_PROVIDER` (`auto` | `heuristic` | `openai` | `mock_fixed`)
- `LLM_BASE_URL` (default OpenAI-compatible)
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_VISION_MODEL`
- `LLM_NUTRITION_MODEL`
- `OPENAI_API_KEY` (backward compatibility)
- `OPENAI_VISION_MODEL`
- `OPENAI_NUTRITION_MODEL`
- `SCAN_LEGACY_COMPONENT_FALLBACK`
- `PUBLIC_API_RATE_LIMIT_PER_MINUTE`

### Web (`apps/web/.env.local`)

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Mobile (`apps/mobile/.env`)

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

## Local setup

1. Install dependencies

```bash
pnpm install
```

2. Copy env files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
cp apps/telegram-bot/.env.example apps/telegram-bot/.env
```

3. Database migrate + seed (local)

```bash
pnpm db:migrate
pnpm db:seed
```

4. Run apps

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
pnpm dev:bot
```

Atau jalankan paralel:

```bash
pnpm dev
```

## Auth policy

- Email/password flow dinonaktifkan
- Login via Google
- Backend hanya menerima Google token dengan `email_verified=true`

## Core API routes

### Auth
- `POST /auth/google`
- `POST /auth/logout`
- `GET /auth/me`

### Profile
- `GET /profile`
- `PUT /profile`

### Scan (authenticated app user)
- `POST /scan/upload-image`
- `POST /scan/process`
- `POST /scan/estimate`

`/scan/process` mengembalikan salah satu:
- `status: "success"`
- `status: "uncertain"`
- `status: "no_food_detected"`

### Meals & tracking
- `POST /meals`
- `GET /meals/:id`
- `GET /history?date=YYYY-MM-DD`
- `GET /dashboard/daily-summary?date=YYYY-MM-DD`
- `GET /dashboard/recent-scans`

### Public API (API key based)
- `POST /api/developer/keys`
- `GET /api/developer/keys`
- `PATCH /api/developer/keys/:id/status`
- `POST /api/public/v1/analyze-food`

Dokumentasi detail:
- [`docs/public-api-analyze-food.md`](docs/public-api-analyze-food.md)
- [`docs/public-api-deployment-readiness.md`](docs/public-api-deployment-readiness.md)
- [`docs/public-api-demo-checklist.md`](docs/public-api-demo-checklist.md)

Postman asset:
- [`docs/postman/NutriMeals-Public-API.postman_collection.json`](docs/postman/NutriMeals-Public-API.postman_collection.json)
- [`docs/postman/NutriMeals-Public-API.postman_environment.json`](docs/postman/NutriMeals-Public-API.postman_environment.json)

## API examples

### Google sign-in

```bash
curl -X POST http://localhost:4000/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"idToken":"<GOOGLE_ID_TOKEN>"}'
```

### Scan process

```bash
curl -X POST http://localhost:4000/scan/process \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"imageUrl":"/uploads/sample.jpg"}'
```

### Public analyze-food

```bash
curl -X POST http://localhost:4000/api/public/v1/analyze-food \
  -H "x-api-key: <NUTRIMEALS_PUBLIC_KEY>" \
  -F "image=@/path/to/food.jpg"
```

## Testing

```bash
pnpm test
```

Termasuk test untuk:
- conversion logic
- nutrition estimation
- dashboard aggregation
- confidence/formatter guardrails
- critical auth behavior

## Google OAuth setup

1. Buat OAuth client IDs di Google Cloud (web/android/iOS sesuai kebutuhan)
2. Isi backend:

```env
GOOGLE_OAUTH_CLIENT_IDS=web_client_id.apps.googleusercontent.com,android_client_id.apps.googleusercontent.com,ios_client_id.apps.googleusercontent.com
```

3. Isi web:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=web_client_id.apps.googleusercontent.com
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

4. Isi mobile:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=expo_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=android_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=ios_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=web_client_id.apps.googleusercontent.com
```

## MVP limitations

- Hasil nutrisi tetap estimasi
- Akurasi portion bergantung kualitas gambar dan inferensi model
- Tidak mencakup barcode/OCR/wearable/chat coach/subscription di MVP

## Android APK (Expo)

```bash
eas build -p android --profile preview
```

(Perlu akun Expo/EAS)
