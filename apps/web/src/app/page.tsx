import Link from 'next/link';
import { BrandLogo } from '../components/brand-logo';

export default function LandingPage() {
  return (
    <main className="row landing-wrap">
      <section className="card">
        <BrandLogo variant="full" />
        <p>
          Catat makanan lebih cepat dengan AI. Foto makananmu, cek analisis nutrisinya, sesuaikan porsi, dan pantau
          asupan harian dengan mudah.
        </p>
        <p className="small">Nilai nutrisi merupakan estimasi dan dapat diubah sebelum disimpan.</p>
        <p className="small">Login dengan akun Google yang emailnya sudah terverifikasi.</p>
      </section>
      <Link href="/login" className="button landing-cta">
        Lanjutkan dengan Google
      </Link>
    </main>
  );
}
