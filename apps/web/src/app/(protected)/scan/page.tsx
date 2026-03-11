'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppNav } from '../../../components/nav';
import { processScan, uploadImage } from '../../../lib/api-client/scan';
import { Card } from '../../../components/ui/card';
import { SectionHeader } from '../../../components/ui/section-header';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';

export default function ScanPage() {
  const router = useRouter();
  const [preview, setPreview] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noFoodMessage, setNoFoodMessage] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  function onPickedFile(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setNoFoodMessage('');
    setError('');
  }

  async function runScan() {
    if (!file) return;
    setLoading(true);
    setError('');
    setNoFoodMessage('');

    try {
      const uploaded = await uploadImage(file);
      const processed = await processScan(uploaded.imageUrl, uploaded.scanId);

      if (processed.status === 'no_food_detected') {
        setNoFoodMessage(processed.message);
        return;
      }

      sessionStorage.setItem('nutriscan_scan_result', JSON.stringify(processed));
      router.push('/result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses gambar');
    } finally {
      setLoading(false);
    }
  }

  function resetSelection() {
    setFile(null);
    setPreview('');
    setNoFoodMessage('');
    setError('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }

  return (
    <main className="stack">
      <AppNav />
      <Card className="hero-card">
        <SectionHeader title="Scan makanan" subtitle="Scan makanan dengan kamera, lalu edit estimasi AI jika diperlukan." />
      </Card>
      <Card className="row glass">

        <input ref={cameraInputRef} className="hidden-file-input" type="file" accept="image/*" capture="environment" onChange={onPickedFile} />
        <input ref={uploadInputRef} className="hidden-file-input" type="file" accept="image/*" onChange={onPickedFile} />

        {!preview ? (
          <>
            <div className="surface preview-card">
              <div className="camera-placeholder">
                <p className="small m-0">Pratinjau kamera akan tampil di sini</p>
              </div>
            </div>
            <Button onClick={() => cameraInputRef.current?.click()}>Ambil foto</Button>
            <Button variant="secondary" onClick={() => uploadInputRef.current?.click()}>Unggah gambar</Button>
          </>
        ) : (
          <>
            <div className="surface scan-preview-shell">
              <img src={preview} alt="preview" className="scan-preview-img" />
              {loading ? (
                <div className="scan-overlay" aria-live="polite">
                  <div className="scan-line" />
                  <p className="scan-overlay-copy">Menganalisis makanan Anda...</p>
                </div>
              ) : null}
            </div>
            <div className="action-row">
              <Button variant="secondary" className="fill" onClick={resetSelection}>Foto ulang</Button>
              <Button className="fill" onClick={runScan} disabled={loading}>
                {loading ? 'Menganalisis makanan Anda...' : 'Analisis scan'}
              </Button>
            </div>
          </>
        )}

        <p className="small">Nutrisi hanya ditampilkan ketika makanan dikenali dengan cukup jelas.</p>
        {noFoodMessage && (
          <EmptyState title="Makanan tidak terdeteksi" description={noFoodMessage} />
        )}
        {error && <p className="error">{error}</p>}
      </Card>
    </main>
  );
}
