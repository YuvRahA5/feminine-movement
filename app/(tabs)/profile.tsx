import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase, errText } from '../../src/supabase';
import { useAuth, firstName } from '../../src/auth';
import { Btn, Card, T, Toggle } from '../../src/ui';
import { C, rtl } from '../../src/theme';
import { dm } from '../../src/data';
import { FAQ, WHATSAPP } from '../../src/texts';

export default function Profile() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [openQ, setOpenQ] = useState(-1);

  async function setField(field: string, value: boolean) {
    if (!session) return;
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', session.user.id);
    if (error) Alert.alert('לא נשמר', errText(error));
    await refreshProfile();
  }

  function deleteAccount() {
    Alert.alert('למחוק את החשבון?', 'כל הפרטים, ההרשמות והסרטונים שלך יימחקו לצמיתות. אי אפשר לבטל את זה.', [
      { text: 'לא', style: 'cancel' },
      { text: 'למחוק', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('delete_my_account');
        if (error) return Alert.alert('לא הצלחנו למחוק', errText(error));
        await signOut();
        router.replace('/login');
      } },
    ]);
  }

  const until = profile?.health_signed_at ? new Date(new Date(profile.health_signed_at).getTime() + 2 * 365 * 864e5) : null;
  const row = [rtl.row, { justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 56 }] as any;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
        <T size={30} weight="bold">הפרופיל שלי</T>

        <Card style={[rtl.row, { alignItems: 'center', gap: 14 }] as any}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.burgundy, alignItems: 'center', justifyContent: 'center' }}>
            <T size={24} color="#F0D6B0" center>{firstName(profile).charAt(0)}</T>
          </View>
          <View style={{ flex: 1 }}>
            <T size={18} weight="bold">{profile?.display_name}</T>
            <T size={14} color={C.muted}>{profile?.phone || session?.user.email}</T>
          </View>
        </Card>

        <Card>
          <View style={row}>
            <View style={{ flex: 1 }}><T>התראות מהאפליקציה</T><T size={13} color={C.muted}>המשפט היומי, תזכורות לשיעור, מקום שהתפנה</T></View>
            <Toggle label="התראות" on={!!profile?.notifications_ok} onToggle={() => setField('notifications_ok', !profile?.notifications_ok)} />
          </View>
        </Card>

        <View style={{ gap: 10 }}>
          <T size={20} weight="bold">צילום בשיעורים</T>
          <Card>
            <View style={row}>
              <View style={{ flex: 1 }}><T>צילום למסע שלי</T><T size={13} color={C.muted}>סרטונים פרטיים, רק לך וליובל</T></View>
              <Toggle label="צילום למסע שלי" on={!!profile?.photo_journey_ok} onToggle={() => setField('photo_journey_ok', !profile?.photo_journey_ok)} />
            </View>
            <View style={row}>
              <View style={{ flex: 1 }}><T>שיתוף ברשתות של הסטודיו</T><T size={13} color={C.muted}>רק באישור שלך לכל פרסום</T></View>
              <Toggle label="שיתוף ברשתות" on={!!profile?.photo_social_ok} onToggle={() => setField('photo_social_ok', !profile?.photo_social_ok)} />
            </View>
          </Card>
        </View>

        <View style={{ gap: 10 }}>
          <T size={20} weight="bold">שאלות נפוצות</T>
          <Card style={{ paddingVertical: 4 }}>
            {FAQ.map((f, i) => (
              <View key={i} style={{ borderBottomWidth: i < FAQ.length - 1 ? 1 : 0, borderColor: C.borderSoft }}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: openQ === i }} onPress={() => setOpenQ(openQ === i ? -1 : i)}
                  style={[rtl.row, { minHeight: 54, alignItems: 'center', justifyContent: 'space-between', gap: 10 }]}>
                  <T style={{ flex: 1 }}>{f.q}</T>
                  <T size={20} color={C.gold}>{openQ === i ? '−' : '+'}</T>
                </Pressable>
                {openQ === i ? <T size={15} color={C.textSoft} style={{ paddingBottom: 14 }}>{f.a}</T> : null}
              </View>
            ))}
          </Card>
        </View>

        <View style={{ gap: 10 }}>
          <T size={20} weight="bold">מסמכים וחתימות</T>
          <Card>
            <View style={row}><T>הצהרת בריאות</T><T size={14} color={C.gold}>{until ? `בתוקף עד ${dm(until)}.${String(until.getFullYear()).slice(2)}` : 'טרם נחתמה'}</T></View>
            <View style={row}><T>תקנון ומדיניות ביטולים</T><T size={14} color={C.gold}>{profile?.terms_signed_at ? 'אושר' : 'טרם אושר'}</T></View>
          </Card>
        </View>

        <Btn label="שאלה? כתבי ליובל בוואטסאפ" onPress={() => Linking.openURL(WHATSAPP)} />
        <Btn kind="outline" label="קצת עליי" onPress={() => router.push('/about')} />
        <View style={[rtl.row, { justifyContent: 'center', gap: 24 }]}>
          <Btn kind="ghost" label="התנתקות" onPress={async () => { await signOut(); router.replace('/login'); }} />
          <Btn kind="ghost" label="מחיקת החשבון" onPress={deleteAccount} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
