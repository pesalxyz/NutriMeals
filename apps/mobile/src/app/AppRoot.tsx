import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { apiFetch, API_BASE_URL } from '../services/api/client';
import type { ScanProcessResponse } from '@nutriscan/types';

WebBrowser.maybeCompleteAuthSession();

type Screen = 'login' | 'dashboard' | 'scan' | 'result' | 'history' | 'profile' | 'meal';
type Unit = 'gram' | 'piece' | 'bowl' | 'plate' | 'cup' | 'tablespoon' | 'teaspoon';

type EstimatedItem = {
  name: string;
  normalizedKey: string;
  portion: { unit: Unit; quantity: number };
  gramsResolved: number;
  isEstimated: boolean;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    fiber: number;
    sodium: number;
  };
};

type EditableItem = {
  name: string;
  normalizedKey?: string;
  unit: Unit;
  quantity: number;
  confidence?: number;
};

type ProfileForm = {
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

const UNITS: Unit[] = ['gram', 'piece', 'bowl', 'plate', 'cup', 'tablespoon', 'teaspoon'];
const MEAL_CATEGORIES: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];
const MAIN_NAV: Screen[] = ['dashboard', 'scan', 'history', 'profile'];

const DEFAULT_PROFILE: ProfileForm = {
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

export default function AppRoot() {
  const [screen, setScreen] = useState<Screen>('login');
  const [token, setToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [summary, setSummary] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);

  const [imageUri, setImageUri] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scanId, setScanId] = useState<string | undefined>();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [estimated, setEstimated] = useState<EstimatedItem[]>([]);

  const [history, setHistory] = useState<Array<{ id: string; category: string; eatenAt: string; snapshot?: { calories?: number } }>>([]);
  const [meal, setMeal] = useState<any>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');
  const [resultMode, setResultMode] = useState<'success' | 'uncertain'>('success');
  const [scanMealType, setScanMealType] = useState<ScanProcessResponse['mealType']>('unclear');
  const [scanNotes, setScanNotes] = useState<string[]>([]);
  const [scanDescription, setScanDescription] = useState('');
  const [uncertaintyNotes, setUncertaintyNotes] = useState<string[]>([]);

  const [category, setCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [profile, setProfile] = useState<ProfileForm>(DEFAULT_PROFILE);
  const [profileStatus, setProfileStatus] = useState('');
  const scanLineAnim = useState(() => new Animated.Value(0))[0];

  const [request, , promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID
  });

  const sugarTotal = estimated.reduce((sum, item) => sum + item.nutrition.sugar, 0);
  const displayNotes = useMemo(() => dedupeLines([scanDescription, ...scanNotes]), [scanDescription, scanNotes]);

  useEffect(() => {
    if (!isAnalyzing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 800, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isAnalyzing, scanLineAnim]);

  const nav = useMemo(
    () => (
      <View style={styles.bottomNav}>
        {MAIN_NAV.map((target) => (
          <TouchableOpacity
            key={target}
            onPress={() => setScreen(target)}
            style={[styles.navButton, screen === target && styles.navButtonActive]}
          >
            <Text style={[styles.navButtonText, screen === target && styles.navButtonTextActive]}>{labelize(target)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    [screen]
  );

  async function continueWithGoogle() {
    setAuthError('');
    const result = await promptAsync();
    if (result.type !== 'success') return;

    const idToken = result.authentication?.idToken ?? (typeof result.params?.id_token === 'string' ? result.params.id_token : '');
    if (!idToken) {
      setAuthError('Google tidak mengembalikan ID token.');
      return;
    }

    try {
      const auth = await apiFetch<{ accessToken: string }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken })
      });
      setToken(auth.accessToken);
      setScreen('dashboard');
      await loadSummary(auth.accessToken);
      await loadProfile(auth.accessToken);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login Google gagal');
    }
  }

  async function loadSummary(accessToken = token) {
    const data = await apiFetch<any>('/dashboard/daily-summary', {}, accessToken);
    setSummary(data.totals);
  }

  async function loadProfile(accessToken = token) {
    const data = await apiFetch<{
      profile: Omit<ProfileForm, 'targetCalories' | 'targetProtein' | 'targetCarbs' | 'targetFat'> | null;
      goal: { calories: number; protein: number; carbs: number; fat: number } | null;
    }>('/profile', {}, accessToken);
    if (!data.profile) return;
    setProfile((current) => ({
      ...current,
      ...data.profile,
      targetCalories: data.goal ? Math.round(data.goal.calories) : current.targetCalories,
      targetProtein: data.goal ? Math.round(data.goal.protein) : current.targetProtein,
      targetCarbs: data.goal ? Math.round(data.goal.carbs) : current.targetCarbs,
      targetFat: data.goal ? Math.round(data.goal.fat) : current.targetFat
    }));
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setScanFeedback('Izin galeri ditolak. Mohon izinkan akses lalu coba lagi.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets.length) return;
    setImageUri(result.assets[0].uri);
    setScanFeedback('');
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setScanFeedback('Izin kamera ditolak. Mohon izinkan akses lalu coba lagi.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets.length) return;
    setImageUri(result.assets[0].uri);
    setScanFeedback('');
  }

  async function uploadAndProcess() {
    if (!imageUri) return;

    setIsAnalyzing(true);
    setScanFeedback('');

    try {
      const form = new FormData();
      form.append(
        'image',
        {
          uri: imageUri,
          name: 'scan.jpg',
          type: 'image/jpeg'
        } as any
      );

      const uploadRes = await fetch(`${API_BASE_URL}/scan/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!uploadRes.ok) throw new Error('Unggah gambar gagal');

      const upload = (await uploadRes.json()) as { imageUrl: string; scanId: string };
      setImageUrl(upload.imageUrl);

      const processed = await apiFetch<ScanProcessResponse>(
        '/scan/process',
        {
          method: 'POST',
          body: JSON.stringify({ imageUrl: upload.imageUrl, scanId: upload.scanId })
        },
        token
      );

      setScanId(processed.scanId);
      setScanMealType(processed.mealType);
      setScanNotes(processed.notes);
      setScanDescription(processed.description ?? '');
      setUncertaintyNotes('uncertaintyNotes' in processed ? (processed.uncertaintyNotes ?? []) : []);

      if (processed.status === 'no_food_detected') {
        setScanFeedback(processed.message);
        setItems([]);
        setEstimated([]);
        return;
      }

      if (processed.status === 'uncertain') {
        setResultMode('uncertain');
        setScanFeedback(processed.message);
        setItems(
          processed.suggestions.map((p) => ({
            name: p.name,
            normalizedKey: p.normalizedKey,
            unit: p.suggestedUnit,
            quantity: p.suggestedQuantity ?? 1,
            confidence: p.confidence
          }))
        );
        if (processed.estimatedTotalNutrition) {
          setSummary({
            calories: processed.estimatedTotalNutrition.calories,
            protein: processed.estimatedTotalNutrition.protein,
            carbs: processed.estimatedTotalNutrition.carbs,
            fat: processed.estimatedTotalNutrition.fat
          });
        }
      } else {
        setResultMode('success');
        setScanFeedback(processed.message);
        setItems(
          processed.items.map((p) => ({
            name: p.name,
            normalizedKey: p.normalizedKey,
            unit: p.suggestedUnit,
            quantity: p.suggestedQuantity ?? 1,
            confidence: p.confidence
          }))
        );
        setSummary({
          calories: processed.totalNutrition.calories,
          protein: processed.totalNutrition.protein,
          carbs: processed.totalNutrition.carbs,
          fat: processed.totalNutrition.fat
        });
      }

      setScreen('result');
    } catch (error) {
      setScanFeedback(error instanceof Error ? error.message : 'Scan gagal');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function estimateAndSave(save: boolean) {
    const est = await apiFetch<{ items: EstimatedItem[]; totals: any }>(
      '/scan/estimate',
      {
        method: 'POST',
        body: JSON.stringify({
          scanId,
          items: items.map((item) => ({
            name: item.name,
            normalizedKey: item.normalizedKey,
            unit: item.unit,
            quantity: item.quantity
          }))
        })
      },
      token
    );

    setEstimated(est.items);
    setSummary(est.totals);

    if (save) {
      await apiFetch(
        '/meals',
        {
          method: 'POST',
          body: JSON.stringify({
            scanId,
            category,
            eatenAt: new Date().toISOString(),
            imageUrl,
            items: est.items.map((item) => ({
              name: item.name,
              normalizedKey: item.normalizedKey,
              unit: item.portion.unit,
              quantity: item.portion.quantity,
              gramsResolved: item.gramsResolved,
              isEstimated: item.isEstimated,
              ...item.nutrition
            }))
          })
        },
        token
      );

      setScreen('dashboard');
      await loadSummary();
    }
  }

  async function loadHistory() {
    const data = await apiFetch<any[]>('/history', {}, token);
    setHistory(data);
  }

  async function loadMeal(id: string) {
    const data = await apiFetch<any>(`/meals/${id}`, {}, token);
    setMeal(data);
    setScreen('meal');
  }

  async function saveProfile() {
    await apiFetch(
      '/profile',
      {
        method: 'PUT',
        body: JSON.stringify(profile)
      },
      token
    );
    setProfileStatus('saved');
  }

  function logout() {
    setToken('');
    setScreen('login');
    setHistory([]);
    setMeal(null);
    setSummary(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {token ? (
        <View style={styles.appFrame}>
          <ScrollView contentContainerStyle={styles.scrollBody}>
            <View style={styles.brandBar}>
              <Image source={require('../../assets/branding/splash-icon.png')} style={styles.brandBarLogo} />
              <View>
                <Text style={styles.brandBarTitle}>NutriMeals</Text>
                <Text style={styles.brandBarSubtitle}>Scan. Eat. Know.</Text>
              </View>
            </View>

            {screen === 'dashboard' && (
              <>
                <SectionHeader title="Dashboard" subtitle="Ikhtisar asupan harian Anda" />
                <AppCard>
                  <Text style={styles.overline}>Kalori harian</Text>
                  <Text style={styles.heroValue}>{Math.round(summary?.calories ?? 0)} kcal</Text>
                  <Text style={styles.bodyMuted}>
                    Protein {Math.round(summary?.protein ?? 0)}g • Karbo {Math.round(summary?.carbs ?? 0)}g • Lemak {Math.round(summary?.fat ?? 0)}g
                  </Text>
                  <Button label="Scan Sekarang" onPress={() => setScreen('scan')} />
                </AppCard>

                <AppCard>
                  <SectionHeader title="Ringkasan makro" compact />
                  <View style={styles.grid}>
                    <StatTile label="Protein" value={`${Math.round(summary?.protein ?? 0)}g`} />
                    <StatTile label="Karbo" value={`${Math.round(summary?.carbs ?? 0)}g`} />
                    <StatTile label="Lemak" value={`${Math.round(summary?.fat ?? 0)}g`} />
                    <StatTile label="Kalori" value={`${Math.round(summary?.calories ?? 0)}`} />
                  </View>
                </AppCard>
              </>
            )}

            {screen === 'scan' && (
              <>
                <SectionHeader title="Scan makanan" subtitle="Ambil foto atau unggah dari galeri" />
                <AppCard>
                  <View style={styles.previewShell}>
                    {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <EmptyState title="Belum ada gambar" description="Ambil foto untuk memulai analisis." />}
                    {imageUri && isAnalyzing ? (
                      <View style={styles.scanOverlay}>
                        <Animated.View
                          style={[
                            styles.scanLine,
                            { transform: [{ translateY: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }) }] }
                          ]}
                        />
                        <Text style={styles.scanOverlayText}>Menganalisis makanan Anda...</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.buttonRow}>
                    <Button variant="secondary" label="Ambil foto" onPress={takePhoto} />
                    <Button variant="secondary" label="Unggah gambar" onPress={pickImage} />
                  </View>
                  {imageUri ? <Button variant="ghost" label="Foto ulang" onPress={() => setImageUri('')} /> : null}
                  {scanFeedback ? <Text style={styles.errorText}>{scanFeedback}</Text> : null}
                  <Button label={isAnalyzing ? 'Menganalisis makanan Anda...' : 'Analisis scan'} onPress={uploadAndProcess} disabled={!imageUri || isAnalyzing} />
                </AppCard>
              </>
            )}

            {screen === 'result' && (
              <>
                <SectionHeader title="Hasil scan" subtitle="Tinjau dan sesuaikan sebelum disimpan" />

                {imageUri ? (
                  <AppCard>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  </AppCard>
                ) : null}

                <AppCard>
                  <SectionHeader title={resultMode === 'uncertain' ? 'Kemungkinan makanan terdeteksi' : 'Makanan terdeteksi'} compact />
                  <Text style={styles.bodyMuted}>
                    {scanFeedback || (resultMode === 'uncertain' ? 'Kami menemukan item kemungkinan, mohon konfirmasi manual.' : 'Nutrisi diestimasi dari komponen yang terlihat.')}
                  </Text>
                  <Badge label={mealTypeLabel(scanMealType)} tone={resultMode === 'uncertain' ? 'warning' : 'success'} />
                  {displayNotes.map((note, idx) => (
                    <Text key={`${note}-${idx}`} style={styles.bodyMuted}>{note}</Text>
                  ))}
                  {uncertaintyNotes.map((note, idx) => (
                    <Text key={`u-${note}-${idx}`} style={styles.bodyMuted}>Catatan: {note}</Text>
                  ))}
                  <Text style={styles.retryNote}>Catatan: Jika hasil scanner kurang akurat, coba scan ulang untuk hasil lebih baik.</Text>
                </AppCard>

                {summary ? (
                  <AppCard>
                    <Text style={styles.overline}>Estimasi nutrisi</Text>
                    <Text style={styles.heroValue}>{Math.round(summary.calories)} kcal</Text>
                    <View style={styles.grid}>
                      <StatTile label="Protein" value={`${Math.round(summary.protein)}g`} />
                      <StatTile label="Karbo" value={`${Math.round(summary.carbs)}g`} />
                      <StatTile label="Lemak" value={`${Math.round(summary.fat)}g`} />
                      <StatTile label="Gula" value={`${Math.round(sugarTotal)}g`} />
                    </View>
                  </AppCard>
                ) : null}

                <AppCard>
                  <SectionHeader title="Komponen makanan" compact />
                  {items.length === 0 ? <EmptyState title="Komponen belum ada" description="Coba scan ulang atau tambahkan item manual." /> : null}

                  {items.map((item, idx) => (
                    <View key={`${item.name}-${idx}`} style={styles.componentCard}>
                      <TextInput
                        style={styles.input}
                        value={item.name}
                        onChangeText={(name) => setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, name } : it)))}
                        placeholder="Nama makanan"
                        placeholderTextColor="#9ca3af"
                      />

                      <View style={styles.row}>
                        <TextInput
                          style={[styles.input, styles.flex]}
                          value={String(item.quantity)}
                          keyboardType="numeric"
                          onChangeText={(value) => setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, quantity: Number(value) || 0 } : it)))}
                          placeholder="Jumlah"
                          placeholderTextColor="#9ca3af"
                        />
                        <Text style={styles.inlineLabel}>satuan</Text>
                      </View>

                      <ChipRow
                        options={UNITS}
                        selected={item.unit}
                        onSelect={(unit) => setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, unit } : it)))}
                      />

                      <View style={styles.rowBetween}>
                        <Badge label={`Keyakinan ${Math.round((item.confidence ?? 0) * 100)}%`} />
                        {estimated[idx] ? (
                          <Text style={styles.bodyMuted}>
                            {estimated[idx].gramsResolved}g • {estimated[idx].isEstimated ? 'Estimasi' : 'Tepat'}
                          </Text>
                        ) : null}
                      </View>

                      <TouchableOpacity onPress={() => setItems((cur) => cur.filter((_, i) => i !== idx))}>
                        <Text style={styles.removeText}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <Button variant="secondary" label="+ Tambah item" onPress={() => setItems((cur) => [...cur, { name: '', unit: 'gram', quantity: 100 }])} />

                  <ChipRow options={MEAL_CATEGORIES} selected={category} onSelect={(value) => setCategory(value)} />

                  <Button variant="secondary" label="Estimasi nutrisi" onPress={() => estimateAndSave(false)} />
                  <Button label="Simpan makanan" onPress={() => estimateAndSave(true)} />
                </AppCard>
              </>
            )}

            {screen === 'history' && (
              <>
                <SectionHeader title="Riwayat makanan" subtitle="Scan terbaru dan makanan tersimpan" />
                <AppCard>
                  <Button variant="secondary" label="Muat ulang" onPress={loadHistory} />
                  {history.length === 0 ? <EmptyState title="Belum ada data scan" description="Coba scan makanan pertama Anda." /> : null}
                  {history.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.historyCard} onPress={() => loadMeal(item.id)}>
                      <Text style={styles.cardTitle}>{labelize(item.category)}</Text>
                      <Text style={styles.bodyMuted}>
                        {new Date(item.eatenAt).toLocaleString()} • {Math.round(item.snapshot?.calories ?? 0)} kcal
                      </Text>
                    </TouchableOpacity>
                  ))}
                </AppCard>
              </>
            )}

            {screen === 'meal' && meal && (
              <>
                <SectionHeader title={labelize(meal.category)} subtitle="Detail makanan" />
                <AppCard>
                  {(meal.items ?? []).map((item: any, idx: number) => (
                    <View key={`${item.customName}-${idx}`} style={styles.historyCard}>
                      <Text style={styles.cardTitle}>{item.customName}</Text>
                      <Text style={styles.bodyMuted}>
                        {item.quantity} {item.unit} • {Math.round(item.calories)} kcal
                      </Text>
                    </View>
                  ))}
                </AppCard>
              </>
            )}

            {screen === 'profile' && (
              <>
                <SectionHeader title="Profil" subtitle="Dipakai untuk personalisasi target harian" />
                <AppCard>
                  <Field label="Nama lengkap" value={profile.fullName} onChangeText={(v) => setProfile((cur) => ({ ...cur, fullName: v }))} />
                  <View style={styles.row}>
                    <Field
                      label="Usia"
                      keyboardType="numeric"
                      value={String(profile.age)}
                      onChangeText={(v) => setProfile((cur) => ({ ...cur, age: Number(v) || 0 }))}
                      style={styles.flex}
                    />
                    <Field
                      label="Berat (kg)"
                      keyboardType="numeric"
                      value={String(profile.weightKg)}
                      onChangeText={(v) => setProfile((cur) => ({ ...cur, weightKg: Number(v) || 0 }))}
                      style={styles.flex}
                    />
                  </View>
                  <Field
                    label="Tinggi (cm)"
                    keyboardType="numeric"
                    value={String(profile.heightCm)}
                    onChangeText={(v) => setProfile((cur) => ({ ...cur, heightCm: Number(v) || 0 }))}
                  />

                  <Text style={styles.subLabel}>Jenis kelamin</Text>
                  <ChipRow options={['female', 'male', 'other'] as const} selected={profile.gender} onSelect={(gender) => setProfile((cur) => ({ ...cur, gender }))} />

                  <Text style={styles.subLabel}>Aktivitas harian</Text>
                  <ChipRow
                    options={['sedentary', 'light', 'moderate', 'active', 'very_active'] as const}
                    selected={profile.activityLevel}
                    onSelect={(activityLevel) => setProfile((cur) => ({ ...cur, activityLevel }))}
                  />

                  <Text style={styles.subLabel}>Tujuan</Text>
                  <ChipRow
                    options={['lose_weight', 'maintain', 'gain_weight', 'healthy_eating'] as const}
                    selected={profile.goal}
                    onSelect={(goal) => setProfile((cur) => ({ ...cur, goal }))}
                  />

                  <Text style={styles.subLabel}>Target harian (bisa diubah)</Text>
                  <View style={styles.row}>
                    <Field
                      label="Kalori (kcal)"
                      keyboardType="numeric"
                      value={String(profile.targetCalories)}
                      onChangeText={(v) => setProfile((cur) => ({ ...cur, targetCalories: Number(v) || 0 }))}
                      style={styles.flex}
                    />
                    <Field
                      label="Protein (g)"
                      keyboardType="numeric"
                      value={String(profile.targetProtein)}
                      onChangeText={(v) => setProfile((cur) => ({ ...cur, targetProtein: Number(v) || 0 }))}
                      style={styles.flex}
                    />
                  </View>
                  <View style={styles.row}>
                    <Field
                      label="Karbo (g)"
                      keyboardType="numeric"
                      value={String(profile.targetCarbs)}
                      onChangeText={(v) => setProfile((cur) => ({ ...cur, targetCarbs: Number(v) || 0 }))}
                      style={styles.flex}
                    />
                    <Field
                      label="Lemak (g)"
                      keyboardType="numeric"
                      value={String(profile.targetFat)}
                      onChangeText={(v) => setProfile((cur) => ({ ...cur, targetFat: Number(v) || 0 }))}
                      style={styles.flex}
                    />
                  </View>

                  <Button label="Simpan profil" onPress={saveProfile} />
                  {profileStatus ? <Text style={styles.successText}>Profil tersimpan.</Text> : null}
                  <Button variant="ghost" label="Keluar" onPress={logout} />
                </AppCard>
              </>
            )}
          </ScrollView>
          {nav}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.loginBody}>
          <AppCard>
            <Image source={require('../../assets/branding/splash-icon.png')} style={styles.loginLogo} />
            <Text style={styles.loginTitle}>NutriMeals</Text>
            <Text style={styles.loginTagline}>Scan. Eat. Know.</Text>
            <Text style={styles.bodyMuted}>Masuk dengan akun Google yang email-nya sudah terverifikasi.</Text>
            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
            <Button label="Lanjutkan dengan Google" onPress={continueWithGoogle} disabled={!request} />
          </AppCard>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function AppCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionHeader({ title, subtitle, compact }: { title: string; subtitle?: string; compact?: boolean }) {
  return (
    <View style={compact ? undefined : styles.sectionHeader}>
      <Text style={compact ? styles.sectionTitleCompact : styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.bodyMuted}>{subtitle}</Text> : null}
    </View>
  );
}

function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        disabled && styles.buttonDisabled
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' && styles.buttonPrimaryText,
          variant === 'secondary' && styles.buttonSecondaryText,
          variant === 'ghost' && styles.buttonGhostText
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' }) {
  return (
    <View style={[styles.badge, tone === 'success' && styles.badgeSuccess, tone === 'warning' && styles.badgeWarning]}>
      <Text style={[styles.badgeText, tone === 'success' && styles.badgeSuccessText, tone === 'warning' && styles.badgeWarningText]}>{label}</Text>
    </View>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.bodyMuted}>{description}</Text>
    </View>
  );
}

function Field({ label, style, ...props }: { label: string; style?: any } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.subLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#9ca3af" {...props} />
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  selected,
  onSelect
}: {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          onPress={() => onSelect(option)}
          style={[styles.chip, selected === option && styles.chipActive]}
        >
          <Text style={[styles.chipText, selected === option && styles.chipTextActive]}>{labelize(option)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function labelize(input: string) {
  const key = input.toLowerCase();
  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    scan: 'Scan',
    history: 'Riwayat',
    profile: 'Profil',
    breakfast: 'Sarapan',
    lunch: 'Makan Siang',
    dinner: 'Makan Malam',
    snack: 'Camilan',
    lose_weight: 'Turun Berat',
    maintain: 'Pertahankan',
    gain_weight: 'Naik Berat',
    healthy_eating: 'Makan Sehat',
    sedentary: 'Sedentari',
    light: 'Ringan',
    moderate: 'Sedang',
    active: 'Aktif',
    very_active: 'Sangat Aktif',
    male: 'Laki-laki',
    female: 'Perempuan',
    other: 'Lainnya',
    piece: 'potong',
    bowl: 'mangkuk',
    plate: 'piring',
    cup: 'cangkir',
    tablespoon: 'sendok makan',
    teaspoon: 'sendok teh',
    gram: 'gram'
  };
  if (map[key]) return map[key];
  return input.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupeLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const next = line?.trim();
    if (!next) continue;
    const lower = next.toLowerCase();
    const exists = out.some((value) => {
      const current = value.toLowerCase();
      return current === lower || current.includes(lower) || lower.includes(current);
    });
    if (!exists) out.push(next);
  }
  return out.slice(0, 6);
}

function mealTypeLabel(value: ScanProcessResponse['mealType']): string {
  const map: Record<ScanProcessResponse['mealType'], string> = {
    mixed_plate: 'piring campur',
    single_item: 'satu item',
    packaged_food: 'makanan kemasan',
    drink: 'minuman',
    unclear: 'belum jelas'
  };
  return map[value] ?? value.replaceAll('_', ' ');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2f8f8' },
  appFrame: { flex: 1 },
  scrollBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96, gap: 12, backgroundColor: '#f2f8f8' },
  loginBody: { padding: 16, minHeight: '100%', justifyContent: 'center', backgroundColor: '#f2f8f8' },

  sectionHeader: { gap: 4, marginBottom: 2 },
  sectionTitle: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#0b1220', letterSpacing: -0.4 },
  sectionTitleCompact: { fontSize: 20, lineHeight: 24, fontWeight: '700', color: '#0b1220' },
  loginTitle: { fontSize: 40, lineHeight: 44, fontWeight: '800', color: '#0b1220', letterSpacing: -0.8 },
  loginTagline: { fontSize: 17, lineHeight: 24, color: '#0d7aa8', fontWeight: '700' },
  loginLogo: { width: 90, height: 90, borderRadius: 22, alignSelf: 'center' },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cddce6',
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  brandBarLogo: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: '#cddce6' },
  brandBarTitle: { color: '#0b1220', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  brandBarSubtitle: { color: '#0d7aa8', fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d3e0e8',
    padding: 16,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 4
  },

  overline: { fontSize: 13, color: '#5f6f87', fontWeight: '600' },
  heroValue: { fontSize: 40, lineHeight: 44, fontWeight: '800', color: '#0b1220', letterSpacing: -0.8 },
  bodyText: { fontSize: 16, lineHeight: 24, color: '#0b1220' },
  bodyMuted: { fontSize: 16, lineHeight: 24, color: '#5f6f87' },
  retryNote: { fontSize: 14, lineHeight: 20, color: '#92400e', fontWeight: '600' },
  subLabel: { fontSize: 13, fontWeight: '600', color: '#41546d' },

  errorText: { fontSize: 15, color: '#ef4444', lineHeight: 22 },
  successText: { fontSize: 14, color: '#0e9f6e', lineHeight: 20, fontWeight: '600' },

  buttonRow: { gap: 8 },
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14
  },
  buttonPrimary: {
    backgroundColor: '#1aa77a',
    borderWidth: 1,
    borderColor: '#17936b',
    shadowColor: '#1f6fd6',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3
  },
  buttonSecondary: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cddce6' },
  buttonGhost: { backgroundColor: '#edf6ff', borderWidth: 1, borderColor: '#d0e0ee' },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonPrimaryText: { color: '#ffffff' },
  buttonSecondaryText: { color: '#0d4f8a' },
  buttonGhostText: { color: '#0d6894' },

  previewShell: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cddce6',
    backgroundColor: '#f2f8ff',
    minHeight: 240,
    justifyContent: 'center',
    overflow: 'hidden'
  },
  previewImage: { width: '100%', height: 280, borderRadius: 12 },
  scanOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.38)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: '#34d399'
  },
  scanOverlayText: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: {
    width: '48.7%',
    borderWidth: 1,
    borderColor: '#d2dfea',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    gap: 2
  },
  statLabel: { fontSize: 12, color: '#5f6f87', fontWeight: '600' },
  statValue: { fontSize: 24, lineHeight: 30, color: '#0b1220', fontWeight: '700' },

  componentCard: {
    borderWidth: 1,
    borderColor: '#d2dfea',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)'
  },
  historyCard: {
    borderWidth: 1,
    borderColor: '#d2dfea',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    gap: 4
  },
  cardTitle: { fontSize: 17, lineHeight: 22, color: '#0b1220', fontWeight: '700' },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#d2dfea',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0b1220'
  },
  fieldWrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
  inlineLabel: { fontSize: 13, color: '#5f6f87', fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: '#d2dfea',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingVertical: 7,
    paddingHorizontal: 11
  },
  chipActive: { borderColor: '#8cd6f5', backgroundColor: '#ecf7ff' },
  chipText: { fontSize: 13, color: '#5f6f87', fontWeight: '600' },
  chipTextActive: { color: '#0d6894' },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d2dfea',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f6fbff'
  },
  badgeText: { fontSize: 12, color: '#5f6f87', fontWeight: '700' },
  badgeSuccess: { borderColor: '#8ce6c7', backgroundColor: '#e9fbf4' },
  badgeWarning: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  badgeSuccessText: { color: '#0f8a62' },
  badgeWarningText: { color: '#92400e' },

  emptyState: {
    borderWidth: 1,
    borderColor: '#cddce6',
    borderRadius: 12,
    backgroundColor: '#f3f8ff',
    padding: 12,
    gap: 4
  },
  emptyTitle: { fontSize: 16, color: '#0b1220', fontWeight: '700' },

  removeText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  bottomNav: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cddce6',
    padding: 8,
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 6
  },
  navButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navButtonActive: { backgroundColor: '#ecf7ff', borderWidth: 1, borderColor: '#bcd7ea' },
  navButtonText: { color: '#5f6f87', fontSize: 12, fontWeight: '700' },
  navButtonTextActive: { color: '#0d6894' }
});
