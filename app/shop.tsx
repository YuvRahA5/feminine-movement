import React, { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/supabase';
import { useAuth } from '../src/auth';
import { Btn, Card, Screen, T } from '../src/ui';
import { C, rtl } from '../src/theme';
import { creditsLeft, credLabel } from '../src/data';
import { WHATSAPP } from '../src/texts';

type Pack = { id: number; title: string; classes: number; price_ils: number; valid_days: number };

export default function Shop() {
  const { session } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    supabase.from('packages').select('*').eq('active', true).order('sort').then(({ data }) => setPacks((data || []) as Pack[]));
    if (session) creditsLeft(session.user.id).then(setCredits);
  }, [session]);

  // Until UPAY is connected, a purchase is a WhatsApp message to Yuval,
  // who loads the card from her admin screen.
  function buy(p: Pack) {
    const text = `היי יובל, אני רוצה לרכוש ${p.title} (₪${p.price_ils}) 👠`;
    Linking.openURL(`${WHATSAPP}?text=${encodeURIComponent(text)}`).catch(() =>
      Alert.alert('לא הצלחנו לפתוח את וואטסאפ'));
  }

  return (
    <Screen>
      <Btn kind="ghost" label="› חזרה" onPress={() => router.back()} style={{ alignSelf: 'flex-end' }} />
      <View style={{ gap: 4 }}>
        <T size={30} weight="bold">רכישת שיעורים</T>
        <T color={C.muted}>יש לך עכשיו {credLabel(credits)}</T>
      </View>
      {packs.map(p => {
        const save = p.classes * 80 - p.price_ils;
        return (
          <Card key={p.id} style={[rtl.row, { alignItems: 'center', justifyContent: 'space-between', gap: 12 }] as any}>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={18} weight="bold">{p.title}</T>
              <T size={14} color={C.muted}>{p.classes > 1 ? `₪${Math.round(p.price_ils / p.classes)} לשיעור · ` : ''}בתוקף ל־{p.valid_days} ימים</T>
              {save > 0 ? <T size={13} weight="semibold" color={C.goldLight}>חיסכון של ₪{save}</T> : null}
            </View>
            <Btn kind="gold" label={`₪${p.price_ils}`} onPress={() => buy(p)} />
          </Card>
        );
      })}
      <T size={13} color={C.muted}>התשלום באפליקציה יתחבר בקרוב. בינתיים הלחיצה שולחת ליובל הודעה, והכרטיסייה נטענת אצלך אחרי התשלום. ביטול רכישה לפי חוק הגנת הצרכן ותקנון הסטודיו.</T>
    </Screen>
  );
}
