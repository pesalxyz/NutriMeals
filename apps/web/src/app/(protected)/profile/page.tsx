'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '../../../components/nav';
import { getProfile, upsertProfile } from '../../../lib/api-client/profile';
import { Card } from '../../../components/ui/card';
import { SectionHeader } from '../../../components/ui/section-header';
import { Field } from '../../../components/ui/field';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

type FormState = {
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weightKg: number;
  heightCm: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose_weight' | 'maintain' | 'gain_weight' | 'healthy_eating';
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
};

const DEFAULT_STATE: FormState = {
  fullName: '',
  age: 25,
  gender: 'female',
  weightKg: 60,
  heightCm: 165,
  activityLevel: 'moderate',
  goal: 'healthy_eating',
  targetCalories: 2100,
  targetProtein: 100,
  targetCarbs: 260,
  targetFat: 70
};

export default function ProfilePage() {
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [status, setStatus] = useState('');

  useEffect(() => {
    getProfile()
      .then((res) => {
        if (res.profile) {
          setForm((cur) => ({
            ...cur,
            ...(res.profile as Omit<FormState, 'targetCalories' | 'targetProtein' | 'targetCarbs' | 'targetFat'>)
          }));
        }
        if (res.goal) {
          const goal = res.goal;
          setForm((cur) => ({
            ...cur,
            targetCalories: Math.round(goal.calories),
            targetProtein: Math.round(goal.protein),
            targetCarbs: Math.round(goal.carbs),
            targetFat: Math.round(goal.fat)
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="stack">
      <AppNav />
      <Card className="hero-card">
        <SectionHeader title="Profil" subtitle="Atur profil dan target harian sesuai kebutuhan Anda." action={status ? <Badge tone="success">Tersimpan</Badge> : undefined} />
      </Card>
      <Card className="row glass">
        <h3 className="section-title-sm m-0">Data pribadi</h3>
        <Field label="Nama lengkap">
          <input className="input" placeholder="Nama lengkap" value={form.fullName} onChange={(e) => setForm((cur) => ({ ...cur, fullName: e.target.value }))} />
        </Field>
        <div className="form-grid-2">
          <Field label="Usia">
            <input className="input" type="number" value={form.age} onChange={(e) => setForm((cur) => ({ ...cur, age: Number(e.target.value) }))} />
          </Field>
          <Field label="Jenis kelamin">
            <select className="select" value={form.gender} onChange={(e) => setForm((cur) => ({ ...cur, gender: e.target.value as FormState['gender'] }))}>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
              <option value="other">Lainnya</option>
            </select>
          </Field>
        </div>

        <h3 className="section-title-sm mt-8">Data tubuh</h3>
        <div className="form-grid-2">
          <Field label="Berat (kg)">
            <input className="input" type="number" value={form.weightKg} onChange={(e) => setForm((cur) => ({ ...cur, weightKg: Number(e.target.value) }))} />
          </Field>
          <Field label="Tinggi (cm)">
            <input className="input" type="number" value={form.heightCm} onChange={(e) => setForm((cur) => ({ ...cur, heightCm: Number(e.target.value) }))} />
          </Field>
        </div>

        <h3 className="section-title-sm mt-8">Preferensi tujuan</h3>
        <Field label="Aktivitas harian">
          <select className="select" value={form.activityLevel} onChange={(e) => setForm((cur) => ({ ...cur, activityLevel: e.target.value as FormState['activityLevel'] }))}>
            <option value="sedentary">Sedentari</option>
            <option value="light">Ringan</option>
            <option value="moderate">Sedang</option>
            <option value="active">Aktif</option>
            <option value="very_active">Sangat aktif</option>
          </select>
        </Field>
        <Field label="Tujuan">
          <select className="select" value={form.goal} onChange={(e) => setForm((cur) => ({ ...cur, goal: e.target.value as FormState['goal'] }))}>
            <option value="lose_weight">Turun berat badan</option>
            <option value="maintain">Menjaga berat badan</option>
            <option value="gain_weight">Naik berat badan</option>
            <option value="healthy_eating">Makan sehat</option>
          </select>
        </Field>

        <h3 className="section-title-sm mt-8">Target harian (dapat diubah)</h3>
        <div className="form-grid-2">
          <Field label="Kalori harian">
            <input className="input" type="number" value={form.targetCalories} onChange={(e) => setForm((cur) => ({ ...cur, targetCalories: Number(e.target.value) }))} />
          </Field>
          <Field label="Protein (g)">
            <input className="input" type="number" value={form.targetProtein} onChange={(e) => setForm((cur) => ({ ...cur, targetProtein: Number(e.target.value) }))} />
          </Field>
          <Field label="Karbohidrat (g)">
            <input className="input" type="number" value={form.targetCarbs} onChange={(e) => setForm((cur) => ({ ...cur, targetCarbs: Number(e.target.value) }))} />
          </Field>
          <Field label="Lemak (g)">
            <input className="input" type="number" value={form.targetFat} onChange={(e) => setForm((cur) => ({ ...cur, targetFat: Number(e.target.value) }))} />
          </Field>
        </div>

        <Button
          className="cta-button"
          onClick={async () => {
            await upsertProfile(form);
            setStatus('Tersimpan');
          }}
        >
          Simpan profil
        </Button>
        {status && <p className="small m-0">Profil berhasil disimpan.</p>}
      </Card>
    </main>
  );
}
