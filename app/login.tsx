import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { supabase, errText } from '../src/supabase';
import { Btn, Card, Field, Logo, Screen, T } from '../src/ui';
import { C } from '../src/theme';

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  async function submit() {
    setMsg(null);
    if (!email.includes('@')) return setMsg({ text: 'צריך כתובת מייל תקינה' });
    if (password.length < 6) return setMsg({ text: 'הסיסמה צריכה להיות לפחות 6 תווים' });
    setBusy(true);
    try {
      if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          setMsg({ ok: true, text: 'שלחנו לך מייל לאישור. אחרי שתאשרי, חזרי לכאן והתחברי 🖤' });
          setMode('in');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      router.replace('/');
    } catch (e) {
      setMsg({ text: errText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen style={{ paddingTop: 48 }}>
        <Logo size={32} />
        <View style={{ gap: 6, marginTop: 24 }}>
          <T size={30} weight="bold">{mode === 'up' ? 'ברוכה הבאה 🖤' : 'טוב לראות אותך שוב'}</T>
          <T color={C.muted}>{mode === 'up' ? 'יוצרים חשבון פעם אחת, וכל השיעורים שלך כאן.' : 'התחברי עם המייל והסיסמה שלך.'}</T>
        </View>
        <Card>
          <Field label="מייל" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
            autoComplete="email" textContentType="emailAddress" placeholder="name@gmail.com" style={{ textAlign: 'left' }} />
          <Field label="סיסמה" value={password} onChangeText={setPassword} secureTextEntry
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'} placeholder="לפחות 6 תווים" />
          {msg ? <T size={15} color={msg.ok ? C.goldLight : C.danger}>{msg.text}</T> : null}
          <Btn label={mode === 'up' ? 'יצירת חשבון' : 'כניסה'} onPress={submit} busy={busy} />
        </Card>
        <Btn kind="ghost" label={mode === 'up' ? 'כבר יש לי חשבון – כניסה' : 'אין לי חשבון – הרשמה'}
          onPress={() => { setMode(mode === 'up' ? 'in' : 'up'); setMsg(null); }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
