import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F, rtl } from './theme';

type TProps = TextProps & { size?: number; weight?: keyof typeof F; color?: string; center?: boolean };
export function T({ size = 16, weight = 'regular', color = C.text, center, style, ...p }: TProps) {
  return (
    <Text
      {...p}
      style={[rtl.text, { fontFamily: F[weight], fontSize: size, color, lineHeight: Math.round(size * 1.5) },
        center && { textAlign: 'center' }, style]}
    />
  );
}

export function Screen({ children, scroll = true, style }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle }) {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[s.pad, style]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={[s.pad, { flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, tone = 'plain' }: { children: React.ReactNode; style?: ViewStyle; tone?: 'plain' | 'wine' }) {
  return <View style={[s.card, tone === 'wine' && s.cardWine, style]}>{children}</View>;
}

type BtnKind = 'primary' | 'gold' | 'outline' | 'ghost';
export function Btn({ label, onPress, kind = 'primary', disabled, busy, style }:
  { label: string; onPress?: () => void; kind?: BtnKind; disabled?: boolean; busy?: boolean; style?: ViewStyle }) {
  const bg = kind === 'primary' ? C.wine : kind === 'gold' ? C.gold : 'transparent';
  const fg = kind === 'gold' ? C.onGold : kind === 'ghost' ? C.muted : C.warm;
  const border = kind === 'outline' ? C.gold : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        kind === 'ghost' && { minHeight: 44 }, style]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <T weight="semibold" color={kind === 'outline' ? C.goldLight : fg} center>{label}</T>}
    </Pressable>
  );
}

export function Field({ label, ...p }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T size={14} color={C.muted}>{label}</T>
      <TextInput placeholderTextColor={C.dim} {...p} style={[s.input, rtl.text, p.style]} />
    </View>
  );
}

export function Check({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle}
      style={[rtl.row, { gap: 12, alignItems: 'flex-start', minHeight: 44, paddingVertical: 4 }]}>
      <View style={[s.box, checked && { backgroundColor: C.gold, borderColor: C.gold }]}>
        {checked ? <T size={14} weight="bold" color={C.onGold} center>✓</T> : null}
      </View>
      <T style={{ flex: 1 }}>{label}</T>
    </Pressable>
  );
}

export function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onToggle}
      style={[s.toggle, on ? { backgroundColor: C.gold } : { backgroundColor: C.cardRaised, borderWidth: 1, borderColor: '#4A3036' }]}>
      <View style={[s.knob, on ? { left: 26, backgroundColor: C.onGold } : { left: 4, backgroundColor: C.dim }]} />
    </Pressable>
  );
}

export function Loading() {
  return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.gold} /></View>;
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View>
      <Text style={{ fontFamily: F.medium, fontStyle: 'italic', fontSize: size, color: C.text }}>Feminine Movement</Text>
      <Text style={{ fontFamily: F.medium, fontSize: 11, letterSpacing: 4, color: C.gold }}>BY YUVAL</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, paddingBottom: 40, gap: 18 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 22, padding: 18, gap: 10 },
  cardWine: { backgroundColor: C.burgundy, borderColor: C.burgundyBorder },
  btn: { minHeight: 50, borderRadius: 25, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: '#4A3036', backgroundColor: C.card, color: C.text, paddingHorizontal: 16, fontSize: 17, fontFamily: F.regular },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: C.gold, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  toggle: { width: 54, height: 32, borderRadius: 16 },
  knob: { position: 'absolute', top: 4, width: 24, height: 24, borderRadius: 12 },
});
