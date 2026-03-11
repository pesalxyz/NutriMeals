'use client';

import Script from 'next/script';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithGoogle } from '../../../lib/api-client/auth';
import { setToken } from '../../../lib/auth/session';
import { BrandLogo } from '../../../components/brand-logo';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  function initGoogleButton() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setLoading(true);
        setError('');
        try {
          const result = await loginWithGoogle({ idToken: response.credential });
          setToken(result.accessToken);
          router.push('/dashboard');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Login Google gagal');
        } finally {
          setLoading(false);
        }
      }
    });
    buttonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 320
    });
  }

  useEffect(() => {
    if (!scriptReady) return;
    initGoogleButton();
  }, [scriptReady, router]);

  async function handleDevTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const idToken = String(formData.get('idToken') ?? '');
    if (!idToken) return;
    setLoading(true);
    setError('');
    try {
      const result = await loginWithGoogle({ idToken });
      setToken(result.accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login Google gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <section className="card glass auth-card">
        <BrandLogo variant="full" />
        <h1 className="brand-title">NutriMeals</h1>
        <p className="small auth-tagline">Scan. Eat. Know.</p>
        <p className="small auth-copy">Analisis nutrisi makanan berbasis AI dengan hasil yang bisa diedit.</p>
        <hr className="subtle-divider" />
        <p className="small auth-copy">Masuk dengan akun Google yang email-nya sudah terverifikasi.</p>
        <div className="row">
          <div ref={buttonRef} />
          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && !scriptReady ? (
            <button className="button" type="button" disabled>Memuat Google Sign-In...</button>
          ) : null}
          {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
            <form onSubmit={handleDevTokenSubmit} className="row">
              <input className="input" name="idToken" placeholder="Google ID token (khusus pengembangan)" />
              <button className="button" type="submit" disabled={loading}>{loading ? 'Sedang masuk...' : 'Masuk dengan Google Token'}</button>
            </form>
          ) : null}
          {error && <p className="error">{error}</p>}
        </div>
      </section>
    </main>
  );
}
