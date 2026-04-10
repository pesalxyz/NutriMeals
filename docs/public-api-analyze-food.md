# NutriMeals Public API - Analyze Food

Endpoint ini dipakai developer publik dengan API key internal NutriMeals (`x-api-key`), tanpa login user biasa pada setiap request API.

## 1) Create API Key (Authenticated)

- **Method**: `POST`
- **URL**: `/api/developer/keys`
- **Auth**: `Authorization: Bearer <jwt_token_user>`
- **Body JSON**:

```json
{
  "name": "my-public-integration"
}
```

### Success Response

```json
{
  "id": "ckey_xxx",
  "name": "my-public-integration",
  "key": "nm_live_abc123def456_xxxxxxxxxxxxxxxxx",
  "status": "active",
  "usageCount": 0,
  "createdAt": "2026-04-09T03:00:00.000Z"
}
```

Catatan:
- Nilai `key` plaintext hanya ditampilkan saat pembuatan.
- Simpan key dengan aman.

## 2) Analyze Food (Public API)

- **Method**: `POST`
- **URL**: `/api/public/v1/analyze-food`
- **Headers**:
  - `x-api-key: <nutrimeals_api_key>`
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `image`: file (`jpg/jpeg/png/webp`, max 5MB)

### cURL Example

```bash
curl -X POST "https://your-api-domain/api/public/v1/analyze-food" \
  -H "x-api-key: nm_live_xxxxxxxxx_xxxxxxxxx" \
  -F "image=@/absolute/path/to/food.jpg"
```

### Success Response (food detected)

```json
{
  "success": true,
  "message": "Food analysis completed successfully",
  "data": {
    "food_name": "nasi goreng",
    "estimated_portion": "1 plate",
    "estimated_calories": 520,
    "protein_g": 14.2,
    "carbs_g": 65.4,
    "fat_g": 18.3,
    "confidence": 0.89,
    "notes": [
      "Hasil merupakan estimasi berbasis analisis visual AI."
    ],
    "meal_type": "mixed_plate",
    "components": [],
    "total_nutrition": {
      "calories": 520,
      "protein_g": 14.2,
      "carbs_g": 65.4,
      "fat_g": 18.3,
      "sugar_g": 4.8,
      "fiber_g": 2.4,
      "sodium_mg": 530
    }
  },
  "meta": {
    "request_id": "9be2f557-bbe2-49e4-93ca-7eb7f6fbe16f",
    "processed_at": "2026-04-09T03:03:00.000Z"
  }
}
```

### Uncertain Response

```json
{
  "success": true,
  "message": "AI menemukan kemungkinan komponen makanan, tetapi tingkat keyakinan masih rendah. Mohon konfirmasi sebelum menyimpan.",
  "data": {
    "food_name": "uncertain",
    "estimated_portion": "unknown",
    "confidence": 0.46,
    "meal_type": "mixed_plate",
    "suggestions": []
  },
  "meta": {
    "request_id": "5f8ea8df-37d6-40f6-9953-4f1e77f58a78",
    "processed_at": "2026-04-09T03:05:00.000Z"
  }
}
```

### No-food Response

```json
{
  "success": false,
  "message": "Gambar ini tidak terlihat mengandung makanan yang bisa dikenali.",
  "data": null,
  "meta": {
    "request_id": "66bc29d8-0f8f-49ec-af95-4190c234f171",
    "processed_at": "2026-04-09T03:06:00.000Z"
  }
}
```

### Error Responses

- Missing API key (`401`):
```json
{ "success": false, "message": "API key is required" }
```

- Invalid API key (`401`):
```json
{ "success": false, "message": "Invalid API key" }
```

- Inactive API key (`403`):
```json
{ "success": false, "message": "API key is inactive" }
```

- Rate limit (`429`):
```json
{ "success": false, "message": "Rate limit exceeded. Max 10 requests per minute." }
```

- Invalid image (`400`):
```json
{ "success": false, "message": "Only jpg, jpeg, png, and webp images are allowed" }
```

## 3) Rate Limit

Default: `10 request / menit / API key`.

Konfigurasi env:

```env
PUBLIC_API_RATE_LIMIT_PER_MINUTE=10
```

## 4) Usage Logging

Setiap request valid API key akan dicatat ke tabel `ApiUsageLog`:

- `apiKeyId`
- `endpoint`
- `method`
- `statusCode`
- `durationMs`
- `errorMessage` (jika ada)
- `createdAt`

Counter penggunaan juga diupdate pada tabel `ApiKey` (`usageCount`, `lastUsedAt`).
