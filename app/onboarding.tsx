import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { supabase, errText } from '../src/supabase';
import { useAuth } from '../src/auth';
import { Btn, Card, Check, Field, Screen, T } from '../src/ui';
import { C, rtl } from '../src/theme';
import { HEALTH_TEXT, TERMS_SECTIONS, TERMS_VERSION } from '../src/texts';

// Four steps; the app stays locked until all four are done.
export default function Onboarding() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [health, setHealth] = useState(false);
  const [terms, setTerms] = useState(false);
  const [photo, setPhoto] = useState<boolean | null>(profile?.photo_social_ok ?? null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const first = name.trim().split(/\s+/)[0] || '';

  useEffect(() => {
    if (step !== 4) return;
    supabase.rpc('message_of_day', { shift: 0 }).then(({ data }) => {
      const body = (data as any)?.[0]?.body as string | undefined;
      setPreview((body || 'היי {name} 💋\nתזכרי, הגוף שלך הוא לא פרויקט לתיקון, הוא הבית הכי יפה ובטוח שלך.\nכאן איתך תמיד, יובל 🤍')
        .split('יפה שלי').join(first).split('{name}').join(first));
    });
  }, [step]);

  const canNext = step === 1 ? first.length > 0 : step === 2 ? health : step === 3 ? terms && photo !== null : false;
  const hint = step === 1 ? 'צריך למלא שם כדי להמשיך' : step === 2 ? 'צריך לאשר את הצהרת הבריאות'
    : photo === null ? 'צריך לבחור לגבי צילומים' : 'צריך לאשר את התקנון';

  async function finish(wantsNotif: boolean) {
    if (!session) return;
    setBusy(true); setErr('');
    try {
      const now = new Date().toISOString();
      const row = {
        id: session.user.id, display_name: name.trim(), phone: phone.trim() || null,
        notifications_ok: wantsNotif, photo_social_ok: photo, health_signed_at: now,
        terms_signed_at: now, terms_version: TERMS_VERSION, onboarded_at: now,
      };
      const { error: e1 } = profile
        ? await supabase.from('profiles').update(row).eq('id', session.user.id)
        : await supabase.from('profiles').insert(row);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('health_declarations').insert({ user_id: session.user.id, form_text: HEALTH_TEXT });
      if (e2) throw e2;
      await refreshProfile();
      router.replace('/home');
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={[rtl.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <T weight="medium" style={{ fontStyle: 'italic' }}>Feminine Movement</T>
          <T size={13} color={C.muted}>שלב {step} מתוך 4</T>
        </View>
        <View style={[rtl.row, { gap: 6 }]}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? C.gold : C.borderSoft }} />
          ))}
        </View>

        {step === 1 && (
          <View style={{ gap: 16 }}>
            <T size={30} weight="bold">ברוכה הבאה למקום בו הכל אפשרי 🖤</T>
            <T color={C.textSoft}>והחלק הראשון והמרגש: מה תעדיפי, את שמך המלא או שם חיבה? בשם שתכתבי כאן, אני (יובל) אפנה אלייך בתזכורות ובהודעות.</T>
            <Field label="שם מלא או שם חיבה" value={name} onChangeText={setName} placeholder="איך לקרוא לך?" autoComplete="given-name" />
            <Field label="טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05X-XXXXXXX" autoComplete="tel" />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 14 }}>
            <T size={28} weight="bold">הצהרת בריאות</T>
            <T color={C.textSoft}>{first ? first + ', ' : ''}כדי לרקוד בביטחון, צריך לחתום פעם אחת. ההצהרה בתוקף לשנתיים, ואז נבקש לחדש.</T>
            <Card><T size={15} color={C.textSoft}>{HEALTH_TEXT}</T></Card>
            <Check checked={health} onToggle={() => setHealth(!health)} label="קראתי, הפרטים נכונים, ואני מאשרת את הצהרת הבריאות" />
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 14 }}>
            <T size={18} color={C.gold}>ועוד רגע קטן אחרון…</T>
            <T size={28} weight="bold">התקנון שלנו</T>
            <Card>
              {TERMS_SECTIONS.map(sec => (
                <View key={sec.title} style={{ gap: 4, marginBottom: 6 }}>
                  <T weight="bold" size={17}>{sec.title}</T>
                  {sec.lines.map((l, i) => <T key={i} size={14} color={C.textSoft}>· {l}</T>)}
                </View>
              ))}
            </Card>
            <Card>
              <T weight="bold" size={18}>צילומים בשיעורים 📷</T>
              <T size={14} color={C.textSoft}>לפעמים אני מצלמת רגעים מהשיעורים כדי לשתף את האווירה ברשתות של הסטודיו ולהזמין עוד נשים לרקוד איתנו. מה מתאים לך?</T>
              <Btn kind={photo === true ? 'gold' : 'outline'} label="אני בעניין, אפשר לצלם אותי 🤍" onPress={() => setPhoto(true)} />
              <Btn kind={photo === false ? 'gold' : 'outline'} label="אני מעדיפה לא להצטלם" onPress={() => setPhoto(false)} />
              <T size={13} color={C.muted}>הבחירה לא משפיעה על ההשתתפות שלך, ואפשר לשנות אותה בכל רגע בפרופיל. אם תבקשי, אוריד פרסום שבו רואים אותך תוך 14 יום.</T>
            </Card>
            <Check checked={terms} onToggle={() => setTerms(!terms)} label="קראתי ואני מאשרת את התקנון, מדיניות הביטולים ומדיניות הפרטיות" />
          </View>
        )}

        {step === 4 && (
          <View style={{ gap: 14 }}>
            <T size={28} weight="bold">רוצה לשמוע ממני? 💋</T>
            <T color={C.textSoft}>{first ? first + ', ' : ''}כל יום אשלח לך משפט או משימה קטנה של אהבה עצמית, וגם תזכורת לפני שיעור והודעה כשמתפנה מקום. אפשר לשנות את זה בכל רגע בפרופיל.</T>
            <T size={14} weight="bold" color={C.gold}>דוגמה קטנה:</T>
            <Card tone="wine"><T size={17} color={C.warm}>{preview}</T></Card>
            {err ? <T color={C.danger}>{err}</T> : null}
            <Btn kind="gold" label="כן, אני רוצה התראות" onPress={() => finish(true)} busy={busy} />
            <Btn kind="outline" label="לא, תודה" onPress={() => finish(false)} disabled={busy} />
          </View>
        )}

        {step < 4 && (
          <Btn label={canNext ? 'המשך' : hint} disabled={!canNext} onPress={() => setStep(step + 1)} />
        )}
        {step > 1 && <Btn kind="ghost" label="חזרה" onPress={() => setStep(step - 1)} />}
        {step === 1 && <Btn kind="ghost" label="התנתקות" onPress={async () => { await signOut(); router.replace('/login'); }} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}
