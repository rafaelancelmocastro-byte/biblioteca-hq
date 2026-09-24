import { useEffect, useState } from "react";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { supabase } from "../../services/supabaseClient";

const linkParameters = `${window.location.search}&${window.location.hash}`;
const arrivedFromRecovery = /(?:[?&#])type=recovery(?:[&#]|$)/.test(linkParameters);
const linkHasError = /(?:[?&#])error(?:_code)?=/.test(linkParameters);
if (arrivedFromRecovery) sessionStorage.setItem("biblioteca-hq-recovery-started", String(Date.now()));

export function PasswordResetPage({ onLogin }: { onLogin: () => void }) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkHasError ? "Este link expirou ou já foi usado. Peça uma nova redefinição na tela de login." : !arrivedFromRecovery && !sessionStorage.getItem("biblioteca-hq-recovery-started") ? "Abra o link de redefinição recebido por e-mail para criar uma nova senha." : "");

  useEffect(() => {
    if (!supabase || linkHasError) return;
    let active = true;
    const startedAt = Number(sessionStorage.getItem("biblioteca-hq-recovery-started") || 0);
    const recoveryPending = startedAt > 0 && Date.now() - startedAt < 10 * 60 * 1000;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) { setReady(true); setError(""); }
    });
    if (recoveryPending) void supabase.auth.getSession().then(({ data }) => { if (!active) return; if (data.session) { setReady(true); setError(""); } else setError("Este link expirou ou já foi usado. Peça uma nova redefinição na tela de login."); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!supabase || !ready) { setError("Abra o link de redefinição mais recente recebido por e-mail."); return; }
    if (password.length < 8) { setError("Use uma senha com pelo menos 8 caracteres."); return; }
    if (password !== confirmation) { setError("As senhas não conferem."); return; }
    setBusy(true);
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) throw failure;
      sessionStorage.removeItem("biblioteca-hq-recovery-started");
      await supabase.auth.signOut({ scope: "local" });
      window.history.replaceState({}, "", "/redefinir-senha");
      setCompleted(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível alterar a senha. Peça um novo link."); }
    finally { setBusy(false); }
  };

  return <div className="login-screen min-h-dvh flex items-center justify-center p-4"><main className="login-card w-full max-w-md rounded-[2rem] p-6 sm:p-8"><div className="text-center mb-6"><BrandLogo showTagline className="login-brand" /></div>
    {completed ? <><ShieldCheck className="mx-auto mb-3 text-emerald-400" /><h1 className="text-center text-2xl font-bold">Senha alterada</h1><p className="mt-3 text-center text-sm text-slate-300">Sua nova senha foi salva. Entre com seu e-mail e a senha que acabou de criar. O acesso à leitura continua sujeito à aprovação do pagamento.</p><button type="button" className="studio-primary w-full mt-6" onClick={onLogin}>Ir para o login <ArrowRight /></button></> : <><h1 className="text-center text-2xl font-bold">Crie sua nova senha</h1><p className="mt-3 mb-5 text-center text-sm text-slate-300">Este link serve somente para redefinir a senha. A alteração não libera automaticamente o acesso ao acervo.</p>
      {!ready && !error && <p role="status" className="text-center text-sm text-slate-400 mb-4">Verificando o link recebido por e-mail...</p>}
      {!ready && !error && <p className="text-center text-xs text-slate-400 mb-4">Se a verificação não concluir, peça outro link pela tela de login.</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-200 mb-4">{error}</p>}
      {ready && <form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-slate-300">Nova senha<div className="relative mt-1"><input className="admin-field pr-10" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /><Lock className="absolute right-3 top-3 h-4 w-4 text-slate-500" /></div></label><label className="block text-xs font-semibold text-slate-300">Confirmar nova senha<input className="admin-field mt-1" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label><button type="submit" className="studio-primary w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar nova senha"}</button></form>}
      <button type="button" className="block mx-auto mt-5 text-xs text-[#ffb81f] underline underline-offset-4" onClick={onLogin}>Voltar ao login e pedir outro link</button></>}
  </main></div>;
}
