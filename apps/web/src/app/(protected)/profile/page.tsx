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
          const {
            fullName,
            age,
            gender,
            weightKg,
            heightCm,
            activityLevel,
            goal
          } = res.profile;
          setForm((cur) => ({
            ...cur,
            fullName,
            age,
            gender,
            weightKg,
            heightCm,
            activityLevel,
            goal
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

  function generateTargetHarian() {
    const bmr =
      form.gender === 'male'
        ? 10 * form.weightKg + 6.25 * form.heightCm - 5 * form.age + 5
        : form.gender === 'female'
          ? 10 * form.weightKg + 6.25 * form.heightCm - 5 * form.age - 161
          : 10 * form.weightKg + 6.25 * form.heightCm - 5 * form.age - 78;

    const activityFactor: Record<FormState['activityLevel'], number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const tdee = bmr * activityFactor[form.activityLevel];
    const caloriesBase =
      form.goal === 'lose_weight'
        ? tdee - 400
        : form.goal === 'gain_weight'
          ? tdee + 300
          : tdee;

    const calories = clamp(Math.round(caloriesBase), 1200, 4200);
    const proteinMultiplier = form.goal === 'lose_weight' ? 1.8 : form.goal === 'gain_weight' ? 1.7 : 1.6;
    const protein = clamp(Math.round(form.weightKg * proteinMultiplier), 60, 260);
    const fat = clamp(Math.round((calories * 0.25) / 9), 35, 140);
    const carbs = clamp(Math.round((calories - protein * 4 - fat * 9) / 4), 80, 520);

    setForm((cur) => ({
      ...cur,
      targetCalories: calories,
      targetProtein: protein,
      targetCarbs: carbs,
      targetFat: fat
    }));
    setStatus('Target harian digenerate otomatis');
  }

  async function handleSaveProfile() {
    try {
      const payload = {
        fullName: form.fullName,
        age: form.age,
        gender: form.gender,
        weightKg: form.weightKg,
        heightCm: form.heightCm,
        activityLevel: form.activityLevel,
        goal: form.goal,
        targetCalories: form.targetCalories,
        targetProtein: form.targetProtein,
        targetCarbs: form.targetCarbs,
        targetFat: form.targetFat
      };
      const res = await upsertProfile(payload);
      if (res?.goal) {
        setForm((cur) => ({
          ...cur,
          targetCalories: Math.round(res.goal.calories),
          targetProtein: Math.round(res.goal.protein),
          targetCarbs: Math.round(res.goal.carbs),
          targetFat: Math.round(res.goal.fat)
        }));
      }
      setStatus('profil berhasil disimpan');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Gagal menyimpan profil');
    }
  }

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
        <Button variant="secondary" onClick={generateTargetHarian}>Generate target harian otomatis</Button>
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
          onClick={handleSaveProfile}
        >
          Simpan profil
        </Button>
        {status && <p className="small m-0">{status}.</p>}
      </Card>
    </main>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
