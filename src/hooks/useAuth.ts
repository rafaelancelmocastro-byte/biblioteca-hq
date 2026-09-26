import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ensureActiveSession, isSupabaseConfigured, supabase } from "../services/supabaseClient";
import { forgetOfflineUser, getRememberedOfflineUser, rememberOfflineUser } from "../services/offlineIdentity";

export type AccessProfile = { id: string; email: string; role: "master" | "user"; access_status: "pending_payment" | "lifetime" | "blocked"; is_active: boolean };

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [offlineUserId, setOfflineUserId] = useState(() => getRememberedOfflineUser());

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let currentUserId = "";
    const loadProfile = async (userId: string) => {
      let cached: AccessProfile | null = null;
      try { cached = JSON.parse(localStorage.getItem(`biblioteca-hq-profile:${userId}`) || "null"); } catch { /* ignore invalid cache */ }

      if (!navigator.onLine) {
        if (mounted) setProfile(cached);
        return;
      }

      let data: AccessProfile | null = null;
      let unavailable = false;
      try {
        const result = await supabase!.from("profiles").select("id,email,role,access_status,is_active").eq("id", userId).maybeSingle();
        unavailable = !!result.error;
        data = result.data as AccessProfile | null;
      } catch { unavailable = true; }

      if (data) localStorage.setItem(`biblioteca-hq-profile:${userId}`, JSON.stringify(data));
      if (mounted) setProfile(data || (unavailable ? cached : null));
    };

    const initAuth = async () => {
      let currentSession: Session | null = null;
      try {
        currentSession = await ensureActiveSession();
      } catch {
        // failed
      }
      if (!mounted) return;
      setSession(currentSession);
      currentUserId = currentSession?.user.id || "";
      if (currentUserId) {
        rememberOfflineUser(currentUserId);
        setOfflineUserId(currentUserId);
        await loadProfile(currentUserId);
      } else if (!navigator.onLine) {
        const remembered = getRememberedOfflineUser();
        currentUserId = remembered;
        setOfflineUserId(remembered);
        if (remembered) await loadProfile(remembered);
      }
      setIsLoading(false);
    };
    void initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      const changedUser = currentUserId !== (nextSession?.user.id || "");
      currentUserId = nextSession?.user.id || "";
      if (currentUserId) {
        rememberOfflineUser(currentUserId);
        setOfflineUserId(currentUserId);
        if (changedUser) setIsLoading(true);
        void loadProfile(currentUserId).finally(() => { if (mounted) setIsLoading(false); });
      } else if (navigator.onLine) {
        setProfile(null);
        setIsLoading(false);
      }
    });
    const refreshAccess = () => { if (currentUserId && navigator.onLine) void loadProfile(currentUserId); };
    const restoreOnlineSession = () => {
      if (!navigator.onLine) return;
      void ensureActiveSession().then((restored) => {
        if (!mounted || !restored) return;
        setSession(restored);
        currentUserId = restored.user.id;
        rememberOfflineUser(currentUserId);
        setOfflineUserId(currentUserId);
        void loadProfile(currentUserId);
      }).catch(() => {});
    };
    window.addEventListener("focus", refreshAccess);
    window.addEventListener("online", restoreOnlineSession);
    const refreshTimer = window.setInterval(refreshAccess, 15000);

    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshAccess);
      window.removeEventListener("online", restoreOnlineSession);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    sessionStorage.setItem("user_logged_out", "1");
    if (supabase) await supabase.auth.signOut();
    forgetOfflineUser();
    setOfflineUserId("");
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
      rememberOfflineUser(verified.data.session.user.id);
      setOfflineUserId(verified.data.session.user.id);
      return true;
    } catch (err) {
      console.error("quickSignIn error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { session, profile, offlineUserId, isLoading, signOut, quickSignIn, isSupabaseConfigured };
}
