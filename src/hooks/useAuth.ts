import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

export type AccessProfile = { id: string; email: string; role: "master" | "user"; access_status: "pending_payment" | "lifetime" | "blocked"; is_active: boolean };

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const loadProfile = async (userId: string) => {
      let data: AccessProfile | null = null;
      try {
        const result = await supabase!.from("profiles").select("id,email,role,access_status,is_active").eq("id", userId).maybeSingle();
        data = result.data as AccessProfile | null;
      } catch { /* use the locally cached profile while offline */ }
      if (data) localStorage.setItem(`biblioteca-hq-profile:${userId}`, JSON.stringify(data));
      let cached: AccessProfile | null = null;
      if (!data && !navigator.onLine) { try { cached = JSON.parse(localStorage.getItem(`biblioteca-hq-profile:${userId}`) || "null"); } catch { /* ignore invalid cache */ } }
      if (mounted) setProfile((data as AccessProfile | null) || cached);
    };
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) { setIsLoading(true); void loadProfile(nextSession.user.id).finally(() => { if (mounted) setIsLoading(false); }); }
      else { setProfile(null); setIsLoading(false); }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  };

  return { session, profile, isLoading, signOut, isSupabaseConfigured };
}
