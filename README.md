# NutriMeals (MVP)

AI-assisted nutrition scanner MVP with one shared backend and shared business logic for web (iOS/mobile browser) and Android (Expo).

## Product positioning
NutriMeals provides **AI-assisted nutrition estimates**. It is not a medical-grade diagnostic system.

## Monorepo structure

- `apps/api`: NestJS REST API, Prisma, PostgreSQL
- `apps/web`: Next.js mobile-first web app (optimized for iPhone Safari)
- `apps/mobile`: Expo React Native app (Android installable path)
- `packages/types`: Shared TypeScript contracts
- `packages/domain`: Shared nutrition and portion logic
- `packages/config`: Shared config templates

## Architecture overview

- Auth: Google Sign-In (ID token) + JWT access token
- Food recognition: `FoodRecognitionService` with adapter pattern
  - MVP provider: `MockFoodRecognitionProvider`
  - Real provider integration is intentionally not hardcoded yet
- Nutrition engine: `NutritionEstimationService`
  - Portion conversion with unit defaults
  - Nutrition calculation from food database (or fallback estimate)
  - `isEstimated` flag for uncertain mappings
- Storage: `StorageService` abstraction
  - Current driver: local filesystem
  - Cloud storage adapter can be added behind the same interface

## Tech stack

- Backend: NestJS + Prisma + PostgreSQL
- Web: Next.js App Router + TypeScript
- Mobile: Expo React Native + TypeScript
- Shared logic: Workspace packages (`@nutriscan/types`, `@nutriscan/domain`)

## Environment variables

### Root (`.env.example`)

- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `API_PORT`
- `WEB_URL`
- `MOBILE_APP_SCHEME`
- `STORAGE_DRIVER`
- `LOCAL_UPLOAD_DIR`
- `GOOGLE_OAUTH_CLIENT_IDS` (comma-separated Google OAuth client IDs/audiences)
- `AI_PROVIDER` (`auto` | `heuristic` | `openai` | `mock_fixed`)
- `OPENAI_API_KEY` (optional, required for `AI_PROVIDER=openai`)
- `OPENAI_VISION_MODEL` (optional, default `gpt-4.1-mini`)
- `OPENAI_NUTRITION_MODEL` (optional, default `gpt-4.1-mini`)
- `SCAN_LEGACY_COMPONENT_FALLBACK` (`false` recommended)

### Web (`apps/web/.env.example`)

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Mobile (`apps/mobile/.env.example`)

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

2. Configure environment files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

3. Run migrations and seed

```bash
pnpm db:migrate
pnpm db:seed
```

4. Run apps

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

Or run all:

```bash
pnpm dev
```

## Auth policy

- Password login/register is disabled.
- Users must sign in with Google.
- Backend allows access only when:
  - Google `email_verified = true`

## Core API routes

### Auth

- `POST /auth/google`
- `POST /auth/logout`
- `GET /auth/me`

### Profile

- `GET /profile`
- `PUT /profile`

### Scan

- `POST /scan/upload-image`
- `POST /scan/process`
- `POST /scan/estimate`

`/scan/process` now returns one of:
- `status: "success"` with detected items + auto nutrition estimate
- `status: "uncertain"` with low-confidence suggestions for manual confirmation
- `status: "no_food_detected"` with no nutrition payload

### Meals and Tracking

- `POST /meals`
- `GET /meals/:id`
- `GET /history?date=YYYY-MM-DD`
- `GET /dashboard/daily-summary?date=YYYY-MM-DD`
- `GET /dashboard/recent-scans`

## API examples

### Google sign in

```bash
curl -X POST http://localhost:4000/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"idToken":"<GOOGLE_ID_TOKEN>"}'
```

### Process scan (after uploading image)

```bash
curl -X POST http://localhost:4000/scan/process \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"imageUrl":"/uploads/sample.jpg"}'
```

### Estimate nutrition

```bash
curl -X POST http://localhost:4000/scan/estimate \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "items":[
      {"name":"Nasi Goreng","normalizedKey":"nasi_goreng","unit":"plate","quantity":1},
      {"name":"Ayam Goreng","normalizedKey":"ayam_goreng","unit":"piece","quantity":1}
    ]
  }'
```

## Testing

Run all tests:

```bash
pnpm test
```

Included tests:

- Portion conversion logic
- Nutrition calculation logic
- Daily summary aggregation logic
- Auth service critical behavior
- Nutrition estimation fallback behavior

## Google OAuth setup (required)

1. Create Google OAuth credentials in Google Cloud Console:
- Web client ID (for Next.js)
- Android client ID (for Expo Android)
- iOS client ID (if using iOS native mobile)

2. Configure backend (`apps/api/.env`):
- `GOOGLE_OAUTH_CLIENT_IDS` as comma-separated allowed audiences (all client IDs above)

Example:

```env
GOOGLE_OAUTH_CLIENT_IDS=web_client_id.apps.googleusercontent.com,android_client_id.apps.googleusercontent.com,ios_client_id.apps.googleusercontent.com
```

3. Configure web (`apps/web/.env.local`):

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=web_client_id.apps.googleusercontent.com
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

4. Configure mobile (`apps/mobile/.env`):

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=expo_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=android_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=ios_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=web_client_id.apps.googleusercontent.com
```

## Optional dependency choices

- Real AI provider is optional in MVP:
  - Why optional: faster delivery while preserving adapter architecture.
  - Current default behavior (`AI_PROVIDER=heuristic`): image-dependent heuristic results with strict no-food/uncertain branching.
  - `AI_PROVIDER=mock_fixed` is explicit demo-only mode.
- Cloud object storage is optional in MVP:
  - Why optional: local development simplicity.
  - Current behavior: local disk storage through abstraction.

## MVP limitations (intentional)

- Heuristic provider is not model-grade computer vision
- Portion conversion uses generic defaults when exact food-density mapping is unavailable
- No barcode/OCR/wearables/chat coach/subscriptions in MVP

## Android installable app note

This repo provides Expo Android app foundation. For APK:

```bash
eas build -p android --profile preview
```

(Requires Expo/EAS account and config.)
