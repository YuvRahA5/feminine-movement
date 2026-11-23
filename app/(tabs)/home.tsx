import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../src/supabase';
import { useAuth, firstName } from '../../src/auth';
import { Btn, Card, Logo, T } from '../../src/ui';
import { C, rtl } from '../../src/theme';
import { creditsLeft, credLabel, dayName, dm, hm, myBookings, onDataChanged, upcomingSessions } from '../../src/data';
import { STUDIO_ADDRESS } from '../../src/texts';

export default function Home() {
  const { session, profile } = useAuth();
  const [msg, setMsg] = useState<{ kind: string; body: string } | null>(null);
  const [shift, setShift] = useState(0);
  const [credits, setCredits] = useState(0);
  const [mine, setMine] = useState<{ when: string; level: string; status: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : 'ערב טוב';

  const load = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    const [c, b, s] = await Promise.all([creditsLeft(uid), myBookings(uid), upcomingSessions().catch(() => [])]);
    setCredits(c);
    const byId: Record<string, any> = {};
    s.forEach(x => { byId[x.id] = x; });
    setMine(b.filter(x => byId[x.session_id]).map(x => {
      const d = new Date(byId[x.session_id].starts_at);
      return { when: `${dayName(d)} ${dm(d)} · ${hm(d)}`, level: byId[x.session_id].level, status: x.status === 'booked' ? 'רשומה' : 'בהמתנה' };
    }));
  }, [session]);

  useEffect(() => { load(); return onDataChanged(load); }, [load]);
  useEffect(() => {
    supabase.rpc('message_of_day', { shift }).then(({ data }) => {
      const r = (data as any)?.[0];
      if (r) setMsg({ kind: r.kind, body: r.body });
    });
  }, [shift]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl tintColor={C.gold} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={[rtl.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <Logo />
          {profile?.is_admin ? <Btn kind="outline" label="ניהול" onPress={() => router.push('/admin')} style={{ minHeight: 40, paddingHorizontal: 16 }} /> : null}
        </View>

        <View style={{ gap: 4 }}>
          <T size={30} weight="bold">{greeting}, {firstName(profile)} 🖤</T>
          <T color={C.muted}>מה הגוף שלך רוצה להרגיש השבוע?</T>
        </View>

        <Card tone="wine">
          <View style={[rtl.row, { justifyContent: 'space-between' }]}>
            <T size={13} weight="semibold" color="#F0D6B0">{msg?.kind === 'משימה' ? 'המשימה של היום 👠' : 'המשפט של היום 💋'}</T>
            <T size={13} color="#E8C9A0">{dm(now)}</T>
          </View>
          <T size={19} weight="medium" color={C.warm}>{msg?.body || '…'}</T>
          <View style={[rtl.row]}>
            <Btn kind="outline" label="עוד אחד בשבילי" onPress={() => setShift(shift + 1)} style={{ minHeight: 44, borderColor: '#E8C9A0' }} />
          </View>
        </Card>

        <Card style={[rtl.row, { alignItems: 'center', justifyContent: 'space-between' }] as any}>
          <View style={{ gap: 2 }}>
            <T size={14} color={C.muted}>הכרטיסייה שלך</T>
            <T size={26} weight="bold">{credLabel(credits)}</T>
          </View>
          <Btn kind="gold" label="לרכישה 👠" onPress={() => router.push('/shop')} />
        </Card>

        <View style={{ gap: 12 }}>
          <View style={[rtl.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <T size={22} weight="bold">השיעורים שלי</T>
            <Pressable onPress={() => router.push('/schedule')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <T weight="semibold" color={C.gold}>למערכת</T>
            </Pressable>
          </View>
          {mine.length ? mine.map((m, i) => (
            <Card key={i} style={[rtl.row, { justifyContent: 'space-between', alignItems: 'center' }] as any}>
              <View><T weight="bold" size={17}>{m.when}</T><T size={14} color={C.muted}>עקבים · {m.level}</T></View>
              <T weight="semibold" color={C.gold}>{m.status}</T>
            </Card>
          )) : (
            <Card style={{ alignItems: 'center' }}>
              <T size={30} center>👠</T>
              <T color={C.muted} center>עוד לא נרשמת לשיעור. הרצפה מחכה לך.</T>
              <Btn label="לבחור שיעור" onPress={() => router.push('/schedule')} />
            </Card>
          )}
        </View>

        <Pressable onPress={() => router.push('/about')}>
          <Card style={[rtl.row, { alignItems: 'center', gap: 14 }] as any}>
            <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: C.gold, backgroundColor: C.cardRaised, alignItems: 'center', justifyContent: 'center' }}>
              <T size={22}>🖤</T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={18} weight="bold">קצת עליי</T>
              <T size={14} color={C.muted}>מי אני, ולמה הקמתי את המרחב הזה</T>
            </View>
          </Card>
        </Pressable>

        <Btn kind="outline" label={`איך מגיעים · ${STUDIO_ADDRESS}`}
          onPress={() => Linking.openURL('https://waze.com/ul?q=' + encodeURIComponent(STUDIO_ADDRESS))} />
      </ScrollView>
    </SafeAreaView>
  );
}
