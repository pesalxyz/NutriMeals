# NutriMeals
## Scan. Eat. Know.

---

## Slide 1 — Judul
**NutriMeals**  
Scan. Eat. Know.  
AI-assisted food scanner untuk estimasi nutrisi harian.

---

## Slide 2 — Latar Belakang Masalah
- Banyak orang ingin tracking nutrisi, tapi proses manual itu ribet.
- Input makanan satu per satu memakan waktu.
- Hasil tracking sering tidak konsisten karena pengguna cepat lelah.

**Insight:** pengguna butuh alur cepat dari foto makanan ke estimasi nutrisi.

---

## Slide 3 — Solusi
NutriMeals adalah aplikasi yang memungkinkan pengguna:
1. Scan atau upload foto makanan.
2. Dapatkan deteksi komponen makanan berbasis AI.
3. Edit hasil deteksi + atur porsi.
4. Lihat estimasi nutrisi.
5. Simpan ke riwayat dan tracking harian.

---

## Slide 4 — Positioning Produk
**Bukan** alat diagnosis medis.  
**Adalah** AI-assisted nutrition scanner untuk membantu kebiasaan makan lebih sadar.

Label utama produk:
- “AI-assisted”
- “Estimated nutrition”
- “User can edit before save”

---

## Slide 5 — Fitur Utama MVP
- Login Google (backend token verification)
- Dashboard ringkasan kalori & makro
- Scan flow (kamera + upload)
- Review hasil deteksi (editable)
- Estimasi nutrisi per komponen + total
- Simpan meal (breakfast/lunch/dinner/snack)
- Riwayat meal & detail meal
- Profil + target harian (editable)

---

## Slide 6 — Alur Pengguna
1. User login dengan Google.
2. User ambil foto makanan / upload.
3. Sistem analisis gambar.
4. Jika makanan terdeteksi → tampil komponen + confidence.
5. User koreksi item dan porsi.
6. Sistem hitung estimasi nutrisi.
7. User simpan meal.
8. Dashboard & history otomatis update.

---

## Slide 7 — Arsitektur Sistem
**Monorepo:**
- `apps/web` (Next.js)
- `apps/mobile` (Expo RN)
- `apps/api` (NestJS)
- `packages/domain`, `packages/types`

**Backend stack:**
- NestJS + Prisma + PostgreSQL
- JWT auth
- Service modular untuk scan & nutrition

---

## Slide 8 — AI Pipeline (Current)
1. **Computer Vision (OpenAI Vision)** membaca gambar makanan.
2. Sistem menentukan food vs non-food + meal type.
3. OpenAI inference mengubah deskripsi visual menjadi komponen terstruktur.
4. Estimasi porsi + nutrisi per item.
5. Confidence handling:
   - `success`
   - `uncertain`
   - `no_food_detected`

Prinsip penting: hindari halusinasi, utamakan hasil yang bisa diedit user.

---

## Slide 9 — Implementasi Computer Vision
Implementasi Computer Vision ada di backend API:
- `apps/api/src/infra/ai/openai-food-recognition.provider.ts`
  - gambar diubah ke base64 data URL
  - dikirim ke OpenAI Vision (`chat/completions`)
- `apps/api/src/infra/ai/food-recognition.service.ts`
  - memilih provider aktif berdasarkan env (`AI_PROVIDER`)
- `apps/api/src/modules/scan/scan-result.service.ts`
  - orkestrasi hasil vision → inferensi nutrisi → response scan

Konfigurasi production untuk mode vision:
- `AI_PROVIDER=openai`
- `OPENAI_API_KEY` valid
- `OPENAI_VISION_MODEL` terisi

---

## Slide 10 — Dukungan Makanan Lokal
NutriMeals mengutamakan konteks makanan Indonesia:
- nasi putih / nasi campur
- ayam goreng / satay
- telur, sambal, sayur
- saus/kuah sebagai komponen terpisah

Pendekatan: **component-based**, bukan memaksa satu label dish yang salah.

---

## Slide 11 — Desain UI/UX
Tema visual:
- Green → Blue gradient (brand NutriMeals)
- Card modern, soft shadow, glass/tinted surface
- CTA utama menonjol (Scan Sekarang)
- Mobile-first, clean, premium health-tech feel

Halaman utama:
- Dashboard
- Scan
- Hasil scan
- Riwayat
- Profil

---

## Slide 12 — Keamanan & Validasi
- Google token diverifikasi di backend.
- Hanya email terverifikasi yang diterima.
- Validasi request DTO backend.
- Error handling terstruktur di API dan frontend.
- Nilai nutrisi ditandai sebagai estimasi.

---

## Slide 13 — Deployment
- **Frontend**: Vercel (`nutri-meals-web`)
- **Backend + DB**: Railway (API + Postgres)
- Konfigurasi env production:
  - API base URL
  - Google client IDs
  - OpenAI API key
  - JWT secret
  - DATABASE_URL

---

## Slide 14 — Tantangan Implementasi
- Mismatch OAuth origin (Google)
- Build/deploy monorepo di Vercel/Railway
- Sinkronisasi lockfile pnpm
- Hardening endpoint agar payload valid
- Fine-tuning estimasi porsi komponen makanan

---

## Slide 15 — Hasil Yang Sudah Dicapai
- Sistem online end-to-end
- Scan flow berjalan dari foto sampai simpan meal
- Provider scan terkonfirmasi `openai_vision` (computer vision mode aktif)
- UI sudah di-upgrade ke arah premium branding
- Auth Google berjalan dengan backend verification
- Dashboard & history terhubung dengan data nyata

---

## Slide 16 — Roadmap V2
1. Peningkatan akurasi portion estimation (computer vision assist)
2. Model tuning khusus makanan Indonesia
3. Insight nutrisi mingguan otomatis
4. Rekomendasi makan berbasis target pengguna
5. Export report nutrisi (PDF)

---

## Slide 17 — Penutup
**NutriMeals** membantu pengguna mencatat makanan lebih cepat dengan bantuan AI, sambil tetap memberi kontrol penuh lewat fitur edit sebelum simpan.

**Tagline:** Scan. Eat. Know.
