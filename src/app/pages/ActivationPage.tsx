import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { supabase } from "../../services/supabaseClient";

export function ActivationPage({ onComplete, onLogin }: { onComplete: () => void; onLogin: () => void }) {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const verify = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;
      const { data: profile } = await supabase.from("profiles").select("access_status,is_active").eq("id", data.session.user.id).maybeSingle();
      if (!active) return;
      if (profile?.access_status === "lifetime" && profile.is_active) {
        setReady(true);
        setError("");
      } else {
        setError("O pagamento desta conta ainda não foi confirmado.");
      }
    };
    void verify();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void verify();
    });
    const timer = window.setTimeout(() => {
      if (active && !ready) void verify();
    }, 1200);
    return () => { active = false; window.clearTimeout(timer); listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !ready) return;
    if (password.length < 8) { setError("Use uma senha com pelo menos 8 caracteres."); return; }
    if (password !== confirmation) { setError("As senhas não conferem."); return; }
    setBusy(true); setError("");
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) throw failure;
      onComplete();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível salvar sua senha.");
    } finally { setBusy(false); }
  };

  return <div className="login-screen min-h-dvh flex items-center justify-center p-4">
    <main className="login-card w-full max-w-md rounded-[2rem] p-6 sm:p-8">
      <div className="text-center mb-6"><BrandLogo showTagline className="login-brand" /></div>
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10"><CheckCircle2 className="text-emerald-300" /></div>
      <h1 className="text-center text-2xl font-bold text-white">Ative sua conta</h1>
      <p className="mt-2 text-center text-sm leading-6 text-slate-300">Seu acesso é liberado somente para compras confirmadas. Defina sua senha para entrar na Biblioteca HQ.</p>
      {!ready && !error && <p role="status" className="mt-5 text-center text-sm text-slate-400">Validando sua compra...</p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {ready && <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-xs font-semibold text-slate-300">Crie sua senha<div className="relative mt-1"><input className="admin-field pr-10" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><Lock className="absolute right-3 top-3 h-4 w-4 text-slate-500" /></div></label>
        <label className="block text-xs font-semibold text-slate-300">Confirme sua senha<input className="admin-field mt-1" type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        <button className="studio-primary w-full" type="submit" disabled={busy}>{busy ? "Ativando..." : "Criar senha e entrar"} <ArrowRight /></button>
      </form>}
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8fa2b8]" />Use sempre o mesmo e-mail informado no checkout da Lastlink.</div>
      <button type="button" className="mt-5 w-full text-center text-xs text-slate-400 underline underline-offset-4" onClick={onLogin}>Já defini minha senha</button>
    </main>
  </div>;
}
