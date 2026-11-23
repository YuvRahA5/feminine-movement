import { supabase } from './supabase';

export type Session = {
  id: string; title: string; level: string; starts_at: string; ends_at: string; capacity: number; cancelled: boolean;
};
export type MyBooking = { session_id: string; status: string; wait_until_hours: number | null };

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
export const dm = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}`;
export const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const dayName = (d: Date) => DAYS[d.getDay()];

export async function upcomingSessions(): Promise<Session[]> {
  const { data, error } = await supabase.from('class_sessions').select('*')
    .gte('starts_at', new Date().toISOString()).eq('cancelled', false).order('starts_at').limit(30);
  if (error) throw error;
  return (data || []) as Session[];
}

export async function myBookings(userId: string): Promise<MyBooking[]> {
  const { data, error } = await supabase.from('bookings').select('session_id,status,wait_until_hours')
    .eq('user_id', userId).in('status', ['booked', 'waitlist']);
  if (error) throw error;
  return (data || []) as MyBooking[];
}

export async function creditsLeft(userId: string): Promise<number> {
  const { data } = await supabase.from('credit_packs').select('remaining,expires_at')
    .eq('user_id', userId).gt('expires_at', new Date().toISOString());
  return (data || []).reduce((a: number, r: any) => a + (r.remaining || 0), 0);
}

export async function attendedCount(userId: string): Promise<number> {
  // Classes already held that she was booked into.
  const { data } = await supabase.from('bookings').select('status, class_sessions!inner(starts_at)')
    .eq('user_id', userId).in('status', ['booked', 'attended'])
    .lt('class_sessions.starts_at', new Date().toISOString());
  return (data || []).length;
}

// How many spots are taken. Clients can't read other people's bookings,
// so this goes through a counting view the server exposes (see schema).
export async function bookedCounts(ids: string[]): Promise<Record<string, { booked: number; waiting: number }>> {
  if (!ids.length) return {};
  const { data } = await supabase.rpc('session_counts', { ids });
  const out: Record<string, { booked: number; waiting: number }> = {};
  (data || []).forEach((r: any) => { out[r.session_id] = { booked: r.booked, waiting: r.waiting }; });
  return out;
}

// Tiny change signal: screens that show bookings or credits reload when another screen changes them.
const listeners = new Set<() => void>();
export function onDataChanged(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function dataChanged() { listeners.forEach(fn => fn()); }

export function credLabel(n: number) {
  return n === 1 ? 'שיעור אחד' : `${n} שיעורים`;
}
