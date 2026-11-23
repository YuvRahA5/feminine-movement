import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase, errText } from '../src/supabase';
import { useAuth } from '../src/auth';
import { Btn, Card, Screen, T } from '../src/ui';
import { C, rtl } from '../src/theme';
import { dataChanged, dayName, dm, hm, Session } from '../src/data';

type Row = { id: string; status: string; joined_at: string; profiles: { display_name: string } | null };
type Client = { id: string; display_name: string; phone: string | null; photo_journey_ok: boolean };
type Pack = { id: number; title: string; classes: number; price_ils: number; valid_days: number };

export default function Admin() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rosters, setRosters] = useState<Record<string, Row[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const { data: s } = await supabase.from('class_sessions').select('*')
      .gte('starts_at', new Date(Date.now() - 6 * 36e5).toISOString()).eq('cancelled', false).order('starts_at').limit(12);
    const list = (s || []) as Session[];
    setSessions(list);
    if (list.length) {
      const { data: b } = await supabase.from('bookings').select('id,session_id,status,joined_at,profiles(display_name)')
        .in('session_id', list.map(x => x.id)).in('status', ['booked', 'waitlist']).order('joined_at');
      const r: Record<string, Row[]> = {};
      (b || []).forEach((x: any) => { (r[x.session_id] ||= []).push(x); });
      setRosters(r);
    }
    const { data: c } = await supabase.from('profiles').select('id,display_name,phone,photo_journey_ok').order('display_name');
    setClients((c || []) as Client[]);
    const { data: p } = await supabase.from('packages').select('*').eq('active', true).order('sort');
    setPacks((p || []) as Pack[]);
  }, []);

  useEffect(() => { if (profile?.is_admin) { load(); seedMessages(); } }, [profile, load]);

  // First visit only: load the 400 daily messages that ship with the app.
  async function seedMessages() {
    const { count } = await supabase.from('daily_messages').select('id', { count: 'exact', head: true });
    if (count) return;
    const all = require('../src/messages.json') as { type: string; text: string }[];
    const rows = all.map((m, i) => ({ kind: m.type, body: m.text, sort: i + 1 }));
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from('daily_messages').insert(rows.slice(i, i + 100));
      if (error) return Alert.alert('טעינת המשפטים נכשלה', errText(error));
    }
    Alert.alert('400 המשפטים היומיים נטענו ✓');
  }
  if (!profile?.is_admin) return <Redirect href="/home" />;

  async function capacity(s: Session, cap: number) {
    const { error } = await supabase.rpc('admin_set_capacity', { s: s.id, cap: Math.max(0, cap) });
    if (error) return Alert.alert('שגיאה', errText(error));
    await load(); dataChanged();
  }

  function cancelClass(s: Session) {
    Alert.alert('לבטל את השיעור?', 'כל הרשומות יקבלו את השיעור בחזרה לכרטיסייה.', [
      { text: 'לא', style: 'cancel' },
      { text: 'לבטל', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('admin_cancel_session', { s: s.id });
        if (error) return Alert.alert('שגיאה', errText(error));
        await load(); dataChanged();
      } },
    ]);
  }

  // Adds the two regular Tuesday classes for the next 8 weeks (skips ones that already exist).
  async function addTuesdays() {
    setBusy('tue');
    try {
      const have = new Set(sessions.map(s => new Date(s.starts_at).getTime()));
      const rows: any[] = [];
      const d = new Date(); d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7));
      for (let w = 0; w < 8; w++) {
        const day = new Date(d); day.setDate(d.getDate() + 7 * w);
        for (const [h, m, eh, em, level] of [[19, 15, 20, 30, 'מתחילות'], [20, 45, 22, 0, 'בינוני']] as const) {
          const a = new Date(day); a.setHours(h, m, 0, 0);
          const b = new Date(day); b.setHours(eh, em, 0, 0);
          if (a.getTime() > Date.now() && !have.has(a.getTime())) {
            rows.push({ title: `עקבים · ${level}`, level, starts_at: a.toISOString(), ends_at: b.toISOString(), capacity: 12 });
          }
        }
      }
      if (rows.length) {
        const { error } = await supabase.from('class_sessions').insert(rows);
        if (error) throw error;
      }
      Alert.alert(rows.length ? `נוספו ${rows.length} שיעורים` : 'כל השיעורים כבר קיימים');
      await load(); dataChanged();
    } catch (e) { Alert.alert('שגיאה', errText(e)); } finally { setBusy(''); }
  }

  async function giveCredits(p: Pack) {
    if (!client) return;
    Alert.alert('לטעון כרטיסייה?', `${p.title} ל${client.display_name}`, [
      { text: 'לא', style: 'cancel' },
      { text: 'לטעון', onPress: async () => {
        const { error } = await supabase.from('credit_packs').insert({
          user_id: client.id, package_id: p.id, total: p.classes, remaining: p.classes,
          expires_at: new Date(Date.now() + p.valid_days * 864e5).toISOString(), payment_ref: 'ידני',
        });
        if (error) return Alert.alert('שגיאה', errText(error));
        Alert.alert('נטען ✓'); dataChanged();
      } },
    ]);
  }

  async function uploadVideo() {
    if (!client) return;
    if (!client.photo_journey_ok) {
      return Alert.alert('אין אישור צילום', `${client.display_name} לא אישרה צילום למסע. אפשר להעלות רק אחרי שהיא מסמנת את זה בפרופיל.`);
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy('video');
    try {
      const a = res.assets[0];
      const ext = (a.fileName?.split('.').pop() || 'mp4').toLowerCase();
      const path = `${client.id}/${Date.now()}.${ext}`;
      const buf = await (await fetch(a.uri)).arrayBuffer();
      const { error: e1 } = await supabase.storage.from('journey').upload(path, buf, { contentType: a.mimeType || 'video/mp4' });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('videos').insert({ user_id: client.id, storage_path: path });
      if (e2) throw e2;
      Alert.alert('הסרטון עלה ✓', `${client.display_name} תראה אותו במסע שלה.`);
    } catch (e) { Alert.alert('ההעלאה נכשלה', errText(e)); } finally { setBusy(''); }
  }

  return (
    <Screen>
      <View style={[rtl.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <T size={28} weight="bold">ניהול 🐆</T>
        <Btn kind="ghost" label="› חזרה" onPress={() => router.back()} />
      </View>

      <Btn kind="outline" label="הוספת שיעורי שלישי ל־8 שבועות" busy={busy === 'tue'} onPress={addTuesdays} />

      {sessions.map(s => {
        const r = rosters[s.id] || [];
        const booked = r.filter(x => x.status === 'booked');
        const waiting = r.filter(x => x.status === 'waitlist');
        const d = new Date(s.starts_at);
        const open = openId === s.id;
        return (
          <Card key={s.id}>
            <View style={[rtl.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View><T weight="bold" size={17}>{dayName(d)} {dm(d)} · {hm(d)}</T><T size={14} color={C.muted}>{s.title}</T></View>
              <T size={24} weight="bold" color={C.gold}>{booked.length}/{s.capacity}</T>
            </View>
            <T size={13} color={C.goldLight}>{waiting.length ? `${waiting.length} ממתינות` : `${Math.max(0, s.capacity - booked.length)} מקומות פנויים`}</T>
            <View style={[rtl.row, { alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.cardRaised, borderRadius: 16, padding: 6 }]}>
              <T size={14} color={C.textSoft} style={{ paddingHorizontal: 8 }}>מקומות בשיעור</T>
              <View style={[rtl.row, { alignItems: 'center', gap: 6 }]}>
                <Btn kind="outline" label="+" onPress={() => capacity(s, s.capacity + 1)} style={{ minHeight: 44, width: 44, paddingHorizontal: 0 }} />
                <T weight="bold" size={18} style={{ minWidth: 30 }} center>{s.capacity}</T>
                <Btn kind="outline" label="−" onPress={() => capacity(s, s.capacity - 1)} style={{ minHeight: 44, width: 44, paddingHorizontal: 0 }} />
              </View>
            </View>
            <Btn kind="ghost" label={open ? 'סגירת הרשימה' : 'מי מגיעה?'} onPress={() => setOpenId(open ? null : s.id)} />
            {open ? (
              <View>
                {!r.length && <T size={14} color={C.muted}>עוד אין נרשמות.</T>}
                {r.map(x => (
                  <View key={x.id} style={[rtl.row, { justifyContent: 'space-between', minHeight: 36, alignItems: 'center' }]}>
                    <T>{x.profiles?.display_name || '—'}</T>
                    <T size={13} color={C.muted}>{x.status === 'waitlist' ? 'רשימת המתנה' : ''}</T>
                  </View>
                ))}
                <Btn kind="ghost" label="ביטול השיעור" onPress={() => cancelClass(s)} />
              </View>
            ) : null}
          </Card>
        );
      })}

      <Card>
        <T size={20} weight="bold">לקוחה</T>
        <View style={[rtl.row, { flexWrap: 'wrap', gap: 8 }]}>
          {clients.map(c => (
            <Pressable key={c.id} onPress={() => setClient(c)}
              style={{ paddingHorizontal: 14, minHeight: 40, borderRadius: 20, justifyContent: 'center', borderWidth: 1,
                borderColor: client?.id === c.id ? C.gold : C.border, backgroundColor: client?.id === c.id ? '#3A2318' : 'transparent' }}>
              <T size={14}>{c.display_name}</T>
            </Pressable>
          ))}
        </View>
        {client ? (
          <View style={{ gap: 10 }}>
            <T size={14} color={C.muted}>{client.phone || ''}</T>
            <T weight="bold">טעינת כרטיסייה (אחרי תשלום)</T>
            {packs.map(p => <Btn key={p.id} kind="outline" label={`${p.title} · ₪${p.price_ils}`} onPress={() => giveCredits(p)} />)}
            <T weight="bold">סרטון למסע</T>
            <Btn label="בחירת סרטון מהגלריה" busy={busy === 'video'} onPress={uploadVideo} />
          </View>
        ) : <T size={14} color={C.muted}>בחרי לקוחה כדי לטעון כרטיסייה או להעלות סרטון.</T>}
      </Card>
    </Screen>
  );
}
