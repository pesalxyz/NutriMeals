'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppNav } from '../../../components/nav';
import { Card } from '../../../components/ui/card';
import { SectionHeader } from '../../../components/ui/section-header';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';
import { Spinner } from '../../../components/ui/spinner';
import {
  createDeveloperKey,
  listDeveloperKeys,
  updateDeveloperKeyStatus,
  type CreatedDeveloperKey,
  type DeveloperKey
} from '../../../lib/api-client/developer-keys';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<DeveloperKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [createdKey, setCreatedKey] = useState<CreatedDeveloperKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadKeys() {
    try {
      setError(null);
      const data = await listDeveloperKeys();
      setKeys(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat API key');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  async function onCreateOneClick() {
    try {
      setBusyCreate(true);
      setCopied(false);
      setError(null);
      const now = new Date();
      const name = `public-key-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const created = await createDeveloperKey(name);
      setCreatedKey(created);
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat API key');
    } finally {
      setBusyCreate(false);
    }
  }

  async function onToggleStatus(item: DeveloperKey) {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      setBusyMap((cur) => ({ ...cur, [item.id]: true }));
      setError(null);
      await updateDeveloperKeyStatus(item.id, nextStatus);
      setKeys((cur) => cur.map((key) => (key.id === item.id ? { ...key, status: nextStatus } : key)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah status API key');
    } finally {
      setBusyMap((cur) => ({ ...cur, [item.id]: false }));
    }
  }

  async function onCopyKey() {
    if (!createdKey?.key) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
  }

  const activeCount = useMemo(() => keys.filter((key) => key.status === 'active').length, [keys]);

  return (
    <main className="stack">
      <AppNav />
      <Card className="hero-card">
        <SectionHeader
          title="Public API Key"
          subtitle="Generate API key untuk integrasi eksternal dalam satu klik. Simpan key dengan aman karena hanya muncul penuh saat dibuat."
          action={
            <Button className="cta-button w-168" onClick={() => void onCreateOneClick()} disabled={busyCreate}>
              {busyCreate ? 'Membuat...' : 'Generate 1-Click'}
            </Button>
          }
        />
      </Card>

      {createdKey && (
        <Card className="glass">
          <div className="meta-row">
            <h3 className="section-title-sm m-0">API key baru berhasil dibuat</h3>
            <Badge tone="success">Tersimpan sebagai {createdKey.name}</Badge>
          </div>
          <p className="small">
            Ini satu-satunya kali key tampil penuh. Simpan dulu, lalu pakai untuk header <code>x-api-key</code>.
          </p>
          <div className="api-key-secret">
            <code>{createdKey.key}</code>
          </div>
          <div className="action-row">
            <Button variant="secondary" className="fill" onClick={() => void onCopyKey()}>
              {copied ? 'Berhasil dicopy' : 'Copy key'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="glass">
        <div className="meta-row">
          <h3 className="section-title-sm m-0">Daftar API key</h3>
          <Badge>{activeCount} aktif</Badge>
        </div>
        {error ? <p className="error m-0">{error}</p> : null}
        {loading ? (
          <Spinner label="Memuat daftar API key..." />
        ) : keys.length === 0 ? (
          <EmptyState
            title="Belum ada API key"
            description="Klik Generate 1-Click untuk membuat public API key pertama Anda."
          />
        ) : (
          <div className="api-key-grid">
            {keys.map((item) => (
              <div key={item.id} className="surface api-key-item">
                <div className="meta-row">
                  <p className="list-card__title m-0">{item.name}</p>
                  <Badge tone={item.status === 'active' ? 'success' : 'warning'}>
                    {item.status === 'active' ? 'active' : 'inactive'}
                  </Badge>
                </div>
                <p className="small m-0">
                  Preview key: <code>{item.keyPreview}</code>
                </p>
                <p className="small m-0">Usage: {item.usageCount} request</p>
                <p className="small m-0">
                  Dibuat: {new Date(item.createdAt).toLocaleString('id-ID')} • Terakhir dipakai:{' '}
                  {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString('id-ID') : '-'}
                </p>
                <div className="api-key-actions">
                  <Button
                    variant={item.status === 'active' ? 'secondary' : 'primary'}
                    onClick={() => void onToggleStatus(item)}
                    disabled={Boolean(busyMap[item.id])}
                  >
                    {busyMap[item.id]
                      ? 'Menyimpan...'
                      : item.status === 'active'
                        ? 'Nonaktifkan key'
                        : 'Aktifkan key'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
