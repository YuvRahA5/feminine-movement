// Feminine Movement – colours and type, taken from the approved prototype.
export const C = {
  bg: '#0F0B0C',
  card: '#1C1416',
  cardRaised: '#2A1A1E',
  border: '#3A262B',
  borderSoft: '#2E2024',
  burgundy: '#5E1828',
  burgundyBorder: '#7A2A3B',
  wine: '#7A1F33',
  gold: '#C9A06A',
  goldLight: '#E2C08F',
  text: '#F6EEE6',
  textSoft: '#D8C8BC',
  muted: '#B9A79B',
  dim: '#8E7A70',
  onGold: '#1A1012',
  warm: '#FFF5EE',
  danger: '#D98C8C',
};

export const F = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semibold: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
};

// Right-to-left helpers: the app is laid out by hand for Hebrew,
// so it looks right whether or not the phone itself is set to RTL.
export const rtl = {
  row: { flexDirection: 'row-reverse' as const },
  text: { textAlign: 'right' as const, writingDirection: 'rtl' as const },
};
