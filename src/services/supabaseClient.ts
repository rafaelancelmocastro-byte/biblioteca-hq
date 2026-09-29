import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = Boolean(supabase);

let activeSessionPromise: Promise<Session | null> | null = null;

export async function ensureActiveSession(forceRefresh = false): Promise<Session | null> {
  if (!supabase) return null;

  const explicitlyLoggedOut =
    typeof window !== "undefined" && window.sessionStorage.getItem("user_logged_out") === "1";

  if (explicitlyLoggedOut) return null;

  if (!forceRefresh) {
    try {
      const { data } = await supabase.auth.getSession();
      const current = data.session;
      if (current && (!current.expires_at || current.expires_at * 1000 > Date.now() + 30_000)) {
        return current;
      }
    } catch {
      // getSession check failed
    }
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

    const { data } = await supabase.auth.getSession();
    return data.session;
  })().finally(() => {
    activeSessionPromise = null;
  });

  return activeSessionPromise;
}
