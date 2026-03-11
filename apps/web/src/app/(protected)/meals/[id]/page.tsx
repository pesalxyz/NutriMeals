'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppNav } from '../../../../components/nav';
import { getMeal } from '../../../../lib/api-client/meals';

export default function MealDetailPage() {
  const params = useParams<{ id: string }>();
  const [meal, setMeal] = useState<Awaited<ReturnType<typeof getMeal>> | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getMeal(params.id).then(setMeal).catch(() => setMeal(null));
  }, [params.id]);

  return (
    <main className="row">
      <AppNav />
      <section className="card row">
        {!meal ? (
          <p className="small">Memuat detail makanan...</p>
        ) : (
          <>
            <h2 className="mt-0">{categoryLabel(meal.category)}</h2>
            <p className="small">{new Date(meal.eatenAt).toLocaleString()}</p>
            {meal.items.map((item, idx) => (
              <div key={`${item.customName}-${idx}`} className="card meal-item-card">
                <p className="m-0">{item.customName}</p>
                <p className="small m-0">{item.quantity} {item.unit} • {Math.round(item.calories)} kcal</p>
              </div>
            ))}
            <div className="card">
              <p><strong>Total {Math.round(meal.snapshot.calories)} kcal</strong></p>
              <p className="small">Protein {Math.round(meal.snapshot.protein)}g • Karbo {Math.round(meal.snapshot.carbs)}g • Lemak {Math.round(meal.snapshot.fat)}g</p>
            </div>
          </>
        )}
      </section>
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
