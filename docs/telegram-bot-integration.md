# NutriMeals Telegram Bot Integration

Bot ini memakai **Public API NutriMeals** (`/api/public/v1/analyze-food`) dengan `x-api-key`.

## 1) Prasyarat

- Sudah punya token bot dari BotFather (`TELEGRAM_BOT_TOKEN`)
- Sudah punya API key publik NutriMeals (`NUTRIMEALS_PUBLIC_API_KEY`)
- Endpoint API production aktif (`NUTRIMEALS_API_BASE_URL`)

## 2) Setup env

```bash
cp apps/telegram-bot/.env.example apps/telegram-bot/.env
```

Isi `apps/telegram-bot/.env`:

```env
TELEGRAM_BOT_TOKEN=123456:ABCDEF...
NUTRIMEALS_API_BASE_URL=https://nutriscanapi-production.up.railway.app
NUTRIMEALS_PUBLIC_API_KEY=nm_live_xxx_xxx
NUTRIMEALS_TIMEOUT_MS=60000
```

## 3) Jalankan bot lokal

```bash
pnpm install
pnpm dev:bot
```

Jika berhasil, terminal akan menampilkan:

```txt
NutriMeals Telegram bot is running...
```

## 4) Cara pakai di Telegram

1. Buka bot kamu di Telegram
2. Kirim `/start`
3. Kirim foto makanan (atau kirim image sebagai file)
4. Bot akan balas ringkasan nutrisi (kalori, protein, karbo, lemak)

## 5) Arsitektur singkat

1. User kirim foto ke Telegram bot.
2. Bot download file dari Telegram API.
3. Bot kirim file ke `POST /api/public/v1/analyze-food` dengan `x-api-key`.
4. Bot format response JSON menjadi pesan yang mudah dibaca.

## 6) Troubleshooting cepat

- `Missing required env`:
  - cek semua env di `apps/telegram-bot/.env`
- Bot tidak merespons:
  - cek token dari BotFather
  - pastikan proses `pnpm dev:bot` masih jalan
- `Analisis gagal: Invalid API key`:
  - regenerate key via `POST /api/developer/keys`
  - update `NUTRIMEALS_PUBLIC_API_KEY`
- Timeout:
  - naikkan `NUTRIMEALS_TIMEOUT_MS` (mis. 90000)

## 7) Catatan keamanan

- Jangan commit file `.env` ke Git
- Simpan `NUTRIMEALS_PUBLIC_API_KEY` hanya di server bot
- Untuk production, jalankan bot di server terpisah (VPS/Railway service baru)
