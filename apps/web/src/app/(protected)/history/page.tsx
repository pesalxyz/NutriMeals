'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppNav } from '../../../components/nav';
import { listHistory } from '../../../lib/api-client/meals';
import { Card } from '../../../components/ui/card';
import { SectionHeader } from '../../../components/ui/section-header';
import { EmptyState } from '../../../components/ui/empty-state';
import { Spinner } from '../../../components/ui/spinner';
import { Button } from '../../../components/ui/button';

export default function HistoryPage() {
  const [date, setDate] = useState('');
  const [items, setItems] = useState<Awaited<ReturnType<typeof listHistory>>>([]);
  const [loading, setLoading] = useState(true);

  async function load(nextDate?: string) {
    setLoading(true);
    try {
      const result = await listHistory(nextDate);
      setItems(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  return (
    <main className="stack">
      <AppNav />
      <Card className="hero-card">
        <SectionHeader title="Riwayat makanan" subtitle="Tinjau makanan tersimpan dan snapshot nutrisi berdasarkan tanggal." />
      </Card>
      <Card className="row glass">
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            load(e.target.value).catch(() => undefined);
          }}
        />
        {loading ? <Spinner label="Memuat riwayat makanan..." /> : null}
        {!loading && items.length ? items.map((item) => (
          <Link key={item.id} href={`/meals/${item.id}`} className="surface list-card">
            <p className="list-card__title">{categoryLabel(item.category)}</p>
            <p className="small list-card__meta">
              {new Date(item.eatenAt).toLocaleString()} • {Math.round(item.snapshot?.calories ?? 0)} kcal
            </p>
          </Link>
        )) : null}
        {!loading && !items.length ? (
          <EmptyState
            title="Belum ada data scan"
            description="Coba scan makanan pertama Anda untuk mulai mengisi riwayat."
            action={<Link href="/scan"><Button variant="secondary">Scan makanan</Button></Link>}
          />
        ) : null}
      </Card>
    </main>
  );
}

function categoryLabel(value: string): string {
  const map: Record<string, string> = {
    breakfast: 'Sarapan',
    lunch: 'Makan siang',
    dinner: 'Makan malam',
    snack: 'Camilan'
  };
  return map[value] ?? value;
}
