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
    let currentUserId = "";
    const loadProfile = async (userId: string) => {
      let data: AccessProfile | null = null;
      let unavailable = false;
      try {
        const result = await supabase!.from("profiles").select("id,email,role,access_status,is_active").eq("id", userId).maybeSingle();
        unavailable = !!result.error;
        data = result.data as AccessProfile | null;
      } catch { unavailable = true; }
      if (data) localStorage.setItem(`biblioteca-hq-profile:${userId}`, JSON.stringify(data));
      let cached: AccessProfile | null = null;
      if (!data && (unavailable || !navigator.onLine)) { try { cached = JSON.parse(localStorage.getItem(`biblioteca-hq-profile:${userId}`) || "null"); } catch { /* ignore invalid cache */ } }
      if (mounted) setProfile((data as AccessProfile | null) || cached);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      let currentSession = data.session;
      if (!currentSession && !sessionStorage.getItem("user_logged_out")) {
        try {
          const res = await fetch("/api/auth/quick-session", { method: "POST" });
          if (res.ok) {
            const { tokenHash } = await res.json();
            if (tokenHash) {
              const verified = await supabase!.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
              if (verified.data.session) {
                currentSession = verified.data.session;
              }
            }
          }
        } catch { /* proceed without auto-session */ }
      }
      setSession(currentSession);
      currentUserId = currentSession?.user.id || "";
      if (currentUserId) await loadProfile(currentUserId);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      const changedUser = currentUserId !== (nextSession?.user.id || "");
      currentUserId = nextSession?.user.id || "";
      if (currentUserId) { if (changedUser) setIsLoading(true); void loadProfile(currentUserId).finally(() => { if (mounted) setIsLoading(false); }); }
      else { setProfile(null); setIsLoading(false); }
    });
    const refreshAccess = () => { if (currentUserId && navigator.onLine) void loadProfile(currentUserId); };
    window.addEventListener("focus", refreshAccess);
    window.addEventListener("online", refreshAccess);
    const refreshTimer = window.setInterval(refreshAccess, 15000);

    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshAccess);
      window.removeEventListener("online", refreshAccess);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    sessionStorage.setItem("user_logged_out", "1");
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const quickSignIn = async (targetEmail?: string) => {
    if (!supabase) return false;
    setIsLoading(true);
    sessionStorage.removeItem("user_logged_out");
    try {
      const res = await fetch("/api/auth/quick-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (!res.ok) throw new Error("Não foi possível gerar acesso direto.");
      const { tokenHash } = await res.json();
      const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (verified.error || !verified.data.session) throw verified.error || new Error("Falha ao autenticar.");
      setSession(verified.data.session);
      return true;
    } catch (err) {
      console.error("quickSignIn error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { session, profile, isLoading, signOut, quickSignIn, isSupabaseConfigured };
}
