import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase, errText } from '../../src/supabase';
import { useAuth } from '../../src/auth';
import { Btn, Card, Check, T } from '../../src/ui';
import { C, rtl } from '../../src/theme';
import {
  bookedCounts, creditsLeft, credLabel, dataChanged, dayName, dm, hm, myBookings, onDataChanged, Session, upcomingSessions,
} from '../../src/data';

const WAIT_OPTIONS = [
  { h: 0.5, label: 'עד חצי שעה לפני', short: 'חצי שעה לפני השיעור' },
  { h: 2, label: 'עד שעתיים לפני', short: 'שעתיים לפני השיעור' },
  { h: 4, label: 'עד 4 שעות לפני', short: '4 שעות לפני השיעור' },
  { h: 8, label: 'עד 8 שעות לפני', short: '8 שעות לפני השיעור' },
];

export default function Schedule() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mine, setMine] = useState<Record<string, { status: string; wait: number | null }>>({});
  const [counts, setCounts] = useState<Record<string, { booked: number; waiting: number }>>({});
  const [credits, setCredits] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [wl, setWl] = useState<Session | null>(null);
  const [wlH, setWlH] = useState(2);
  const [wlAck, setWlAck] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const s = await upcomingSessions();
      const [b, c, cr] = await Promise.all([myBookings(session.user.id), bookedCounts(s.map(x => x.id)), creditsLeft(session.user.id)]);
      setSessions(s);
      const m: Record<string, any> = {};
      b.forEach(x => { m[x.session_id] = { status: x.status, wait: x.wait_until_hours }; });
      setMine(m); setCounts(c); setCredits(cr);
    } catch (e) { Alert.alert('לא הצלחנו לטעון', errText(e)); }
  }, [session]);

  useEffect(() => { load(); return onDataChanged(load); }, [load]);

  async function book(s: Session, waitHours?: number) {
    setBusyId(s.id);
    try {
      const { data, error } = await supabase.rpc('book_session', { s: s.id, wait_hours: waitHours ?? null });
      if (error) throw error;
      Alert.alert(data === 'waitlist' ? 'נכנסת לרשימת ההמתנה 🔔' : 'נרשמת! נתראה על הרצפה 💋');
      dataChanged();
    } catch (e) {
      const m = errText(e);
      if (m.includes('אין שיעורים')) {
        Alert.alert('אין שיעורים בכרטיסייה', 'כדי להירשם צריך לרכוש שיעור או כרטיסייה 👠', [
          { text: 'לרכישה', onPress: () => router.push('/shop') }, { text: 'סגירה', style: 'cancel' },
        ]);
      } else Alert.alert('לא הצלחנו', m);
    } finally { setBusyId(null); }
  }

  function cancel(s: Session, status: string) {
    const title = status === 'waitlist' ? 'לצאת מרשימת ההמתנה?' : 'לבטל את ההרשמה?';
    const hours = (new Date(s.starts_at).getTime() - Date.now()) / 36e5;
    const body = status === 'waitlist' ? '' : hours >= 8 ? 'השיעור יחזור לכרטיסייה שלך.'
      : 'פחות מ־8 שעות לשיעור: אפשר לבטל רק אם יש מישהי ברשימת ההמתנה שתיכנס במקומך.';
    Alert.alert(title, body, [
      { text: 'לא', style: 'cancel' },
      { text: 'כן', style: 'destructive', onPress: async () => {
        setBusyId(s.id);
        try {
          const { error } = await supabase.rpc('cancel_booking', { s: s.id });
          if (error) throw error;
          dataChanged();
        } catch (e) { Alert.alert('לא ניתן לבטל', errText(e)); }
        finally { setBusyId(null); }
      } },
    ]);
  }

  // group by day
  const groups: { label: string; items: Session[] }[] = [];
  sessions.forEach(s => {
    const d = new Date(s.starts_at);
    const label = `יום ${dayName(d)}, ${dm(d)}`;
    const g = groups.find(x => x.label === label);
    if (g) g.items.push(s); else groups.push({ label, items: [s] });
  });

  const wlOpt = WAIT_OPTIONS.find(o => o.h === wlH)!;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}
        refreshControl={<RefreshControl tintColor={C.gold} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ gap: 4 }}>
          <T size={30} weight="bold">מערכת שיעורים</T>
          <T color={C.muted}>{credLabel(credits)} בכרטיסייה</T>
        </View>

        {!groups.length && <Card><T color={C.muted} center>עוד אין שיעורים פתוחים להרשמה.</T></Card>}

        {groups.map(g => (
          <View key={g.label} style={{ gap: 10 }}>
            <T size={18} weight="bold" color={C.gold}>{g.label}</T>
            {g.items.map(s => {
              const st = mine[s.id]?.status;
              const booked = st === 'booked', wait = st === 'waitlist';
              const cnt = counts[s.id] || { booked: 0, waiting: 0 };
              const left = s.capacity - cnt.booked;
              const full = !booked && left <= 0;
              const start = new Date(s.starts_at), end = new Date(s.ends_at);
              const cancelBy = new Date(start.getTime() - 8 * 36e5);
              let spots = 'יש מקום', color = C.muted;
              if (booked) { spots = `רשומה · ביטול חינם עד ${dayName(cancelBy)} ${hm(cancelBy)}`; color = C.goldLight; }
              else if (wait) { const o = WAIT_OPTIONS.find(x => x.h === Number(mine[s.id]?.wait)); spots = `ברשימת המתנה${o ? ' · ' + o.label : ''}`; color = C.goldLight; }
              else if (full) spots = 'השיעור מלא · אפשר להמתין';
              else if (left <= 3) { spots = left === 1 ? 'נשאר מקום אחרון!' : `נשארו ${left} מקומות אחרונים`; color = '#E89A7A'; }
              const label = booked ? 'ביטול' : wait ? 'יציאה מההמתנה' : full ? 'לרשימת המתנה' : 'להירשם';
              const primary = !booked && !wait && !full;
              return (
                <Card key={s.id} style={[rtl.row, { alignItems: 'center', gap: 14 }] as any}>
                  <View style={{ backgroundColor: C.cardRaised, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', minWidth: 66 }}>
                    <T weight="bold" size={17}>{hm(start)}</T>
                    <T size={12} color={C.muted}>–{hm(end)}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T weight="bold" size={17}>{s.title || `עקבים · ${s.level}`}</T>
                    <T size={13} color={color}>{spots}</T>
                  </View>
                  <Btn kind={primary ? 'primary' : 'outline'} label={label} busy={busyId === s.id}
                    style={{ minHeight: 44, paddingHorizontal: 12 }}
                    onPress={() => booked || wait ? cancel(s, st!) : full ? (setWl(s), setWlH(2), setWlAck(false)) : book(s)} />
                </Card>
              );
            })}
          </View>
        ))}

        <T size={13} color={C.muted}>ביטול עד 8 שעות לפני השיעור מחזיר את השיעור לכרטיסייה. פחות מ־8 שעות לפני, אפשר לבטל רק אם יש מישהי ברשימת ההמתנה שתיכנס במקומך.</T>
      </ScrollView>

      <Modal visible={!!wl} transparent animationType="slide" onRequestClose={() => setWl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(8,5,6,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: C.gold, padding: 20, gap: 12, paddingBottom: 36 }}>
            <T size={24} weight="bold">רשימת המתנה 🔔</T>
            <T color={C.textSoft}>השיעור מלא. עד מתי את רוצה לחכות למקום?</T>
            <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>
              {WAIT_OPTIONS.map(o => (
                <Btn key={o.h} kind={o.h === wlH ? 'gold' : 'outline'} label={o.label} onPress={() => setWlH(o.h)}
                  style={{ width: '48%', minHeight: 48, paddingHorizontal: 8 }} />
              ))}
            </View>
            <Card style={{ backgroundColor: C.cardRaised }}>
              <T size={14} color="#F0D6B0">חשוב לדעת: אם מתפנה מקום עד {wlOpt.short}, את נרשמת לשיעור אוטומטית, יורד שיעור מהכרטיסייה ונשלחת אלייך הודעה. גם אם לא ראית את ההודעה, את רשומה. פחות מ־8 שעות לפני השיעור אי אפשר לבטל, אלא אם יש מישהי אחרת ברשימת ההמתנה.</T>
            </Card>
            <Check checked={wlAck} onToggle={() => setWlAck(!wlAck)} label="הבנתי ואני מסכימה" />
            <Btn label={wlAck ? 'להצטרף לרשימת ההמתנה' : 'צריך לאשר כדי להצטרף'} disabled={!wlAck}
              onPress={() => { const s = wl!; setWl(null); book(s, wlH); }} />
            <Btn kind="ghost" label="ביטול" onPress={() => setWl(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
