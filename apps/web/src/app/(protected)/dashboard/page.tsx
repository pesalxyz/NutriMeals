'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDailySummary } from '../../../lib/api-client/dashboard';
import { AppNav } from '../../../components/nav';
import { Card } from '../../../components/ui/card';
import { SectionHeader } from '../../../components/ui/section-header';
import { EmptyState } from '../../../components/ui/empty-state';
import { Spinner } from '../../../components/ui/spinner';
import { Button } from '../../../components/ui/button';

export default function DashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDailySummary>> | null>(null);

  useEffect(() => {
    getDailySummary().then(setData).catch(() => setData(null));
  }, []);

  return (
    <main className="stack">
      <AppNav />
      <Card className="hero-card">
        <SectionHeader
          title="Hari ini"
          subtitle="Ringkasan nutrisi AI Anda. Total harian dihitung dari komponen makanan yang sudah disimpan."
          action={
            <Link href="/scan" className="w-168">
              <Button className="cta-button">Scan Sekarang</Button>
            </Link>
          }
        />
      </Card>
      <Card className="glass">
        {!data ? (
          <Spinner label="Memuat ringkasan harian..." />
        ) : (
          <>
            <div className="meta-row">
              <p className="small m-0">Kalori harian</p>
              <p className="small m-0">{Math.round(data.progress.calories)}% dari target</p>
            </div>
            <p className="calorie-value">
              {Math.round(data.totals.calories)} <span className="calorie-target">/ {Math.round(data.targets.calories)} kcal</span>
            </p>
            <div className="progress progress--calories"><span style={{ width: `${Math.min(100, data.progress.calories)}%` }} /></div>
          </>
        )}
      </Card>

      <div className="split">
      <Card className="glass">
        <h3 className="section-title-sm">Ringkasan makro</h3>
        {!data ? <Spinner label="Memuat makro..." /> : (
          <div className="kpi-grid">
            <div className="kpi macro-card macro-card--protein"><h4>Protein</h4><p>{Math.round(data.totals.protein)}g</p></div>
            <div className="kpi macro-card macro-card--carbs"><h4>Karbo</h4><p>{Math.round(data.totals.carbs)}g</p></div>
            <div className="kpi macro-card macro-card--fat"><h4>Lemak</h4><p>{Math.round(data.totals.fat)}g</p></div>
            <div className="kpi macro-card macro-card--sugar"><h4>Gula</h4><p>{Math.round(data.totals.sugar)}g</p></div>
          </div>
        )}
      </Card>

      <Card className="glass">
        <h3 className="section-title-sm">Progres target harian</h3>
        {data ? (
          [
            { key: 'protein', total: data.totals.protein, target: data.targets.protein, progress: data.progress.protein },
            { key: 'carbs', total: data.totals.carbs, target: data.targets.carbs, progress: data.progress.carbs },
            { key: 'fat', total: data.totals.fat, target: data.targets.fat, progress: data.progress.fat }
          ].map((macro) => (
            <div key={macro.key} className="macro-row">
              <div className="small">
                {macroLabel(macro.key)}: {Math.round(macro.total)} / {Math.round(macro.target)}g
              </div>
              <div className={`progress progress--${macro.key}`}><span style={{ width: `${Math.min(100, macro.progress)}%` }} /></div>
            </div>
          ))
        ) : (
          <Spinner label="Menyiapkan progres..." />
        )}
      </Card>
      </div>

      <Card className="glass">
        <h3 className="section-title-sm">Makanan terbaru</h3>
        {data?.meals.length ? data.meals.slice(0, 4).map((meal) => (
          <Link key={meal.id} href={`/meals/${meal.id}`} className="surface list-card">
            <p className="list-card__title">{categoryLabel(meal.category)}</p>
            <p className="small list-card__meta">{new Date(meal.eatenAt).toLocaleTimeString()}</p>
          </Link>
        )) : (
          <EmptyState
            title="Belum ada makanan"
            description="Belum ada makanan yang tercatat hari ini. Mulai dengan memindai makanan pertama Anda."
            action={<Link href="/scan"><Button variant="secondary">Scan makanan</Button></Link>}
          />
        )}
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

function macroLabel(value: string): string {
  const map: Record<string, string> = {
    protein: 'Protein',
    carbs: 'Karbo',
    fat: 'Lemak'
  };
  return map[value] ?? value;
}
