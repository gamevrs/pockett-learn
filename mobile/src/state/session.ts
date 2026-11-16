import 'react-native-url-polyfill/auto';
import { createClient, type AuthError, type Session, type User } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { SITE_URL } from '~/lib/site';

import { secureSessionStorage } from './storage';

/**
 * Supabase, with the same public project URL and publishable key the site uses (src/data/supabase/client.ts:
 * public by design, row level security protects the data). The session lives in secure storage.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://irrzwowbetnyppvxflvi.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_WVNVR1HBlLSqBOX-q54bhw_aYWni4Mt';

export const supabase = createClient(URL, KEY, {
  auth: { storage: secureSessionStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, storageKey: 'pockett_auth' },
});

// Refresh tokens only while the app is in front (supabase-js' React Native guidance).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

interface SessionStore {
  status: 'loading' | 'signed-out' | 'signed-in';
  session: Session | null;
  user: User | null;
}

export const useSession = create<SessionStore>()(() => ({ status: 'loading', session: null, user: null }));

let started = false;
export function startSession() {
  if (started) return;
  started = true;
  supabase.auth
    .getSession()
    .then(({ data }) => useSession.setState({ status: data.session ? 'signed-in' : 'signed-out', session: data.session, user: data.session?.user ?? null }))
    .catch(() => useSession.setState({ status: 'signed-out' }));
  supabase.auth.onAuthStateChange((_event, session) => {
    useSession.setState({ status: session ? 'signed-in' : 'signed-out', session, user: session?.user ?? null });
  });
}

export function displayNameOf(user: User | null): string {
  if (!user) return '';
  const meta = user.user_metadata as { display_name?: string; full_name?: string } | undefined;
  return meta?.display_name || meta?.full_name || user.email?.split('@')[0] || 'Learner';
}

/** The site's own wording for auth errors (src/data/auth/store.ts), so both say the same thing. */
function friendly(error: AuthError): Error {
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login')) return new Error("That email and password don't match.");
  if (msg.includes('not confirmed')) return new Error('Please confirm your email first: check your inbox for the link.');
  if (msg.includes('already registered') || msg.includes('already been registered')) return new Error("There's already an account with that email. Try signing in.");
  if (msg.includes('password') && msg.includes('characters')) return new Error('Use a password with at least 8 characters.');
  if (msg.includes('rate limit') || error.status === 429) return new Error('Too many attempts. Wait a minute and try again.');
  if (msg.includes('network') || msg.includes('fetch')) return new Error("Can't reach Pockett. Check your connection and try again.");
  return new Error(error.message);
}

const redirectTo = `${SITE_URL}/account`;

export async function signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim() || undefined }, emailRedirectTo: redirectTo },
  });
  if (error) throw friendly(error);
  if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error("There's already an account with that email. Try signing in.");
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw friendly(error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw friendly(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw friendly(error);
}

export async function updateDisplayName(name: string) {
  const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() || null } });
  if (error) throw friendly(error);
  const uid = useSession.getState().user?.id;
  if (uid) await supabase.from('profiles').update({ display_name: name.trim() || null }).eq('id', uid);
}

export class DeleteUnavailable extends Error {}

/**
 * Deletes the signed-in account (contract §3, the site's src/data/auth/delete-account.ts): checks the password by
 * signing in again, then calls public.delete_my_account(). Throws DeleteUnavailable when the function is not on the
 * server yet (PGRST202), so the screen can offer email instead.
 */
export async function deleteAccount(password: string) {
  const user = useSession.getState().user;
  if (!user?.email) throw new Error("You're not signed in.");
  const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (error) throw error.message.toLowerCase().includes('invalid login') ? new Error("That password isn't right.") : friendly(error);
  if (data.user?.id !== user.id) throw new Error('That password belongs to a different account.');
  const { error: rpcError } = await supabase.rpc('delete_my_account');
  if (rpcError) {
    if (rpcError.code === 'PGRST202' || rpcError.message.includes('Could not find the function')) throw new DeleteUnavailable('Deleting an account from the app is not available yet.');
    throw new Error("Your account couldn't be deleted. Nothing was removed. Try again in a moment.");
  }
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* the local session is removed either way */
  }
}
