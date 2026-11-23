import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  display_name: string;
  phone: string | null;
  is_admin: boolean;
  notifications_ok: boolean | null;
  photo_social_ok: boolean | null;
  photo_journey_ok: boolean;
  health_signed_at: string | null;
  terms_signed_at: string | null;
  onboarded_at: string | null;
};

type Ctx = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  ready: false, session: null, profile: null,
  refreshProfile: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    setProfile((data as Profile) || null);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await loadProfile(s);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => { await loadProfile(session); }, [session, loadProfile]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  return (
    <AuthCtx.Provider value={{ ready, session, profile, refreshProfile, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function firstName(p: Profile | null): string {
  return (p?.display_name || '').trim().split(/\s+/)[0] || 'יפה שלי';
}
