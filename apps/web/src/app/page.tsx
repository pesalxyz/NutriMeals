import Link from 'next/link';
import { BrandLogo } from '../components/brand-logo';

export default function LandingPage() {
  return (
    <main className="landing-wrap auth-wrap">
      <div className="auth-card stack">
        <section className="card hero-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <BrandLogo variant="full" />
          </div>
          <h1 className="brand-title" style={{ fontSize: '32px', marginBottom: '16px' }}>Nutrisi dalam Sekejap</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
            Catat makanan lebih cepat dengan AI canggih. Foto makananmu, cek analisis nutrisinya, dan pantau
            asupan harian layaknya memiliki ahli gizi pribadi.
          </p>
          <div className="stack" style={{ gap: '12px' }}>
            <Link href="/login" className="button cta-button">
              Masuk / Daftar
            </Link>
            <p className="small m-0">Akses cepat dengan Google. Aman dan gratis.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
