import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth';
import { Loading } from '../src/ui';

// The gate: nothing in the app opens until she is signed in AND has finished
// the health declaration, terms and notification choice.
export default function Gate() {
  const { ready, session, profile } = useAuth();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  const healthOk = profile?.health_signed_at && Date.now() - new Date(profile.health_signed_at).getTime() < 2 * 365 * 864e5;
  if (!profile?.onboarded_at || !healthOk || profile.notifications_ok === null) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
