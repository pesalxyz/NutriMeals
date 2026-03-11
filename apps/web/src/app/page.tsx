import Link from 'next/link';
import { BrandLogo } from '../components/brand-logo';

export default function LandingPage() {
  return (
    <main className="row landing-wrap">
      <section className="card">
        <BrandLogo variant="full" />
        <h1 className="landing-title">NutriMeals</h1>
        <p>
          Pemindai nutrisi berbasis AI untuk mencatat makanan lebih cepat. Unggah foto makanan, tinjau hasil deteksi,
          atur porsi, lalu pantau asupan harian.
        </p>
        <p className="small">Nilai nutrisi bersifat estimasi dan bisa diubah sebelum disimpan.</p>
        <p className="small">Masuk menggunakan akun Google yang email-nya terverifikasi.</p>
      </section>
      <Link href="/login" className="button landing-cta">
        Lanjutkan dengan Google
      </Link>
    </main>
  );
}
