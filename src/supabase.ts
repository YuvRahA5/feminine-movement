import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Public values: the project address and its publishable (client) key.
// They are safe to ship inside the app – every table is protected by
// row level security on the server.
export const SUPABASE_URL = 'https://vlnssgrfwjrpladaltmr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YKmyBocLlZ7PorbISkHwQQ_LMneQ5tN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Postgres errors from our booking rules carry Hebrew messages; show those as-is.
export function errText(e: any): string {
  const m = e?.message || String(e || '');
  if (/Invalid login credentials/i.test(m)) return 'המייל או הסיסמה לא נכונים';
  if (/User already registered/i.test(m)) return 'כבר יש חשבון עם המייל הזה. נסי להתחבר';
  if (/Email not confirmed/i.test(m)) return 'צריך לאשר את המייל קודם. בדקי את תיבת הדואר';
  if (/Password should be/i.test(m)) return 'הסיסמה צריכה להיות לפחות 6 תווים';
  if (/network|fetch/i.test(m)) return 'אין חיבור לאינטרנט. נסי שוב';
  return m;
}
