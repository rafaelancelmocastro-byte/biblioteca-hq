import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = Boolean(supabase);

let activeSessionPromise: Promise<Session | null> | null = null;

export async function ensureActiveSession(): Promise<Session | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    const current = data.session;
    // Check if session exists and is valid for at least 30 more seconds
    if (current && (!current.expires_at || current.expires_at * 1000 > Date.now() + 30_000)) {
      return current;
    }
  } catch {
    // getSession check failed
  }

  if (activeSessionPromise) return activeSessionPromise;

  activeSessionPromise = (async () => {
    try {
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.data.session) {
        return refreshed.data.session;
      }
    } catch {
      // Refresh error ignored
    }

    try {
      const res = await fetch("/api/auth/quick-session", { method: "POST" });
      if (res.ok) {
        const { tokenHash } = await res.json();
        if (tokenHash) {
          const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
          if (verified.data.session) {
            return verified.data.session;
          }
        }
      }
    } catch {
      // Quick session error ignored
    }

    const { data } = await supabase.auth.getSession();
    return data.session;
  })().finally(() => {
    activeSessionPromise = null;
  });

  return activeSessionPromise;
}
