# NutriMeals Public API Demo Checklist (3-5 Menit)

Dokumen ini untuk demo cepat ke dosen menggunakan Postman + backend Railway.

## A. Persiapan sebelum demo

1. Pastikan API Railway status **Online**.
2. Pastikan migration production sudah dijalankan.
3. Siapkan data ini di Postman environment:
- `baseUrl` = URL API Railway, contoh `https://nutriscanapi-production.up.railway.app`
- `jwtToken` = token user hasil login Google
- `publicApiKey` = akan diisi dari endpoint create key
- `developerKeyId` = akan diisi dari endpoint create/list key

## B. Endpoint utama demo

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/public/v1/analyze-food`
- **Header wajib**: `x-api-key: {{publicApiKey}}`
- **Body**: `form-data` key `image` (file)

## C. Aset file uji demo

Siapkan file lokal berikut:

1. `food-valid-1.jpg` (gambar makanan valid utama)
2. `food-valid-2.jpg` (gambar makanan cadangan)
3. `not-image.txt` (untuk uji format invalid)
4. opsional `food-over-5mb.jpg` (untuk uji size limit)

## D. Urutan demo 3-5 menit

### 1) Create API key (success)
- Request: `POST {{baseUrl}}/api/developer/keys`
- Header: `Authorization: Bearer {{jwtToken}}`
- Body JSON:
```json
{ "name": "demo-kampus" }
```
- Ambil nilai `key` ke variable `publicApiKey`.
- Ambil nilai `id` ke variable `developerKeyId`.

### 2) List API keys (success)
- Request: `GET {{baseUrl}}/api/developer/keys`
- Header: `Authorization: Bearer {{jwtToken}}`
- Tunjukkan key preview + usage count.

### 3) Public analyze success
- Request: `POST {{baseUrl}}/api/public/v1/analyze-food`
- Header: `x-api-key: {{publicApiKey}}`
- Body form-data: `image=@food-valid-1.jpg`
- Tunjukkan JSON hasil nutrisi.

### 4) Public analyze failure (invalid key)
- Ganti header `x-api-key: invalid_key`
- Expect: `401` + `Invalid API key`

### 5) Public analyze failure (tanpa image)
- Kirim request tanpa field `image`
- Expect: `400` + `Image file is required`

### 6) Public analyze failure (format salah)
- Body `image=@not-image.txt`
- Expect: `400` + `Only jpg, jpeg, png, and webp images are allowed`

### 7) Disable API key
- Request: `PATCH {{baseUrl}}/api/developer/keys/{{developerKeyId}}/status`
- Header: `Authorization: Bearer {{jwtToken}}`
- Body JSON:
```json
{ "status": "inactive" }
```
- Coba panggil analyze pakai key yang sama.
- Expect: `403` + `API key is inactive`

### 8) Rate limit check (opsional)
- Kirim >10 request dalam 1 menit dengan key aktif.
- Expect: `429` + pesan rate limit.

## E. Verifikasi usage log tercatat

Karena belum ada endpoint read log publik, cek langsung DB Railway (Postgres Query):

```sql
SELECT l."createdAt", l."endpoint", l."method", l."statusCode", l."durationMs", l."errorMessage"
FROM "ApiUsageLog" l
JOIN "ApiKey" k ON k."id" = l."apiKeyId"
WHERE k."id" = '<developerKeyId>'
ORDER BY l."createdAt" DESC
LIMIT 20;
```

## F. Contoh response sukses

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
    "notes": ["Hasil merupakan estimasi berbasis analisis visual AI."]
  },
  "meta": {
    "request_id": "uuid",
    "processed_at": "2026-04-09T10:30:00.000Z"
  }
}
```

## G. Contoh response error

```json
{ "success": false, "message": "Invalid API key" }
```
