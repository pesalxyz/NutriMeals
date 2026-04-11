import { Telegraf } from 'telegraf';
import type { Context } from 'telegraf';

const TELEGRAM_BOT_TOKEN = requiredEnv('TELEGRAM_BOT_TOKEN');
const NUTRIMEALS_API_BASE_URL = requiredEnv('NUTRIMEALS_API_BASE_URL').replace(/\/+$/, '');
const NUTRIMEALS_PUBLIC_API_KEY = requiredEnv('NUTRIMEALS_PUBLIC_API_KEY');
const REQUEST_TIMEOUT_MS = Number(process.env.NUTRIMEALS_TIMEOUT_MS ?? 60_000);

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start(async (ctx) => {
  await ctx.reply(
    [
      'Halo! Saya bot NutriMeals.',
      'Kirim foto makanan (langsung dari kamera atau galeri), lalu saya akan analisis nutrisinya dari API NutriMeals.'
    ].join('\n\n')
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    [
      'Perintah:',
      '/start - Mulai bot',
      '/help - Bantuan',
      '',
      'Cara pakai:',
      '1) Kirim foto makanan',
      '2) Tunggu proses analisis',
      '3) Saya kirim hasil estimasi nutrisi'
    ].join('\n')
  );
});

bot.on('photo', async (ctx) => {
  try {
    await ctx.reply('Sedang analisis foto makanan kamu...');

    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];
    const photoBuffer = await downloadTelegramFileBuffer(ctx, best.file_id);

    const result = await analyzeFoodWithPublicApi(photoBuffer, 'telegram-photo.jpg');

    if (!result.success) {
      await ctx.reply(`Analisis gagal: ${result.message}`);
      return;
    }

    await ctx.reply(formatAnalysisMessage(result));
  } catch (error) {
    console.error('[TelegramBot][AnalyzeError]', error);
    await ctx.reply('Maaf, analisis gagal diproses. Coba kirim ulang fotonya.');
  }
});

bot.on('document', async (ctx) => {
  try {
    const doc = ctx.message.document;
    const mime = doc.mime_type ?? '';
    if (!mime.startsWith('image/')) {
      await ctx.reply('File yang dikirim bukan gambar. Kirim foto makanan ya.');
      return;
    }

    await ctx.reply('Sedang analisis gambar kamu...');
    const photoBuffer = await downloadTelegramFileBuffer(ctx, doc.file_id);
    const result = await analyzeFoodWithPublicApi(photoBuffer, doc.file_name ?? 'telegram-image.jpg');

    if (!result.success) {
      await ctx.reply(`Analisis gagal: ${result.message}`);
      return;
    }

    await ctx.reply(formatAnalysisMessage(result));
  } catch (error) {
    console.error('[TelegramBot][DocumentAnalyzeError]', error);
    await ctx.reply('Maaf, terjadi error saat memproses file gambar.');
  }
});

bot.on('message', async (ctx) => {
  if ('text' in ctx.message) {
    await ctx.reply('Kirim foto makanan untuk dianalisis. Kamu juga bisa ketik /help.');
  }
});

bot.launch().then(() => {
  console.log('NutriMeals Telegram bot is running...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

async function downloadTelegramFileBuffer(ctx: Context, fileId: string): Promise<Buffer> {
  const fileLink = await ctx.telegram.getFileLink(fileId);
  const response = await fetch(fileLink.toString());
  if (!response.ok) {
    throw new Error(`Failed to download Telegram file: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function analyzeFoodWithPublicApi(fileBuffer: Buffer, filename: string): Promise<PublicAnalyzeResponse> {
  const form = new FormData();
  const bytes = new Uint8Array(fileBuffer);
  const blob = new Blob([bytes], { type: guessMimeType(filename) });
  form.append('image', blob, filename);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${NUTRIMEALS_API_BASE_URL}/api/public/v1/analyze-food`, {
      method: 'POST',
      headers: {
        'x-api-key': NUTRIMEALS_PUBLIC_API_KEY
      },
      body: form,
      signal: controller.signal
    });

    const payload = (await response.json()) as PublicAnalyzeResponse;

    if (!response.ok) {
      return {
        success: false,
        message: payload?.message ?? `Request failed with status ${response.status}`
      };
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function formatAnalysisMessage(response: PublicAnalyzeResponse): string {
  const data = response.data;

  if (!data) {
    return response.message || 'Tidak ada data analisis.';
  }

  const summary = [
    `🍽️ Makanan: ${data.food_name ?? '-'}`,
    `📦 Porsi: ${data.estimated_portion ?? '-'}`,
    `🔥 Kalori: ${value(data.estimated_calories)} kcal`,
    `💪 Protein: ${value(data.protein_g)} g`,
    `🍚 Karbo: ${value(data.carbs_g)} g`,
    `🥑 Lemak: ${value(data.fat_g)} g`
  ];

  const notes = (data.notes ?? []).slice(0, 2);
  if (notes.length > 0) {
    summary.push('', `Catatan: ${notes.join(' | ')}`);
  }

  return summary.join('\n');
}

function value(input: unknown): string {
  if (typeof input !== 'number' || Number.isNaN(input)) return '-';
  return input.toFixed(1).replace(/\.0$/, '');
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function guessMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

interface PublicAnalyzeResponse {
  success: boolean;
  message: string;
  data?: {
    food_name?: string;
    estimated_portion?: string;
    estimated_calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    notes?: string[];
  } | null;
}
