import React, { useState } from "react";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";

export const LoginPage: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [isRecoveryLink] = useState(() => /type=(invite|recovery)/.test(window.location.hash));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!supabase || !isSupabaseConfigured) { setError("Autenticação indisponível."); return; }
    if (!isRecoveryLink && !email.trim()) { setError("Informe seu e-mail."); return; }
    if (mode !== "recovery" && password.length < 8) { setError("A senha deve ter ao menos 8 caracteres."); return; }
    if ((mode === "signup" || isRecoveryLink) && password !== confirmation) { setError("As senhas não conferem."); return; }
    setBusy(true);
    try {
      if (isRecoveryLink) {
        const { error: failure } = await supabase.auth.updateUser({ password });
        if (failure) throw failure;
        window.history.replaceState({}, "", "/login"); onSuccess(); return;
      }
      if (mode === "recovery") {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login` });
        if (failure) throw failure;
        setNotice("Enviamos um link para redefinir sua senha."); return;
      }
      if (mode === "signup") {
        const { data, error: failure } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/login` } });
        if (failure) throw failure;
        if (data.session) onSuccess();
        else setNotice("Cadastro recebido. Confirme seu e-mail para entrar. O acesso à leitura será liberado após o PIX.");
        return;
      }
      const { error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (failure) throw failure;
      onSuccess();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível concluir. Tente novamente."); }
    finally { setBusy(false); }
  };

  return <div className="login-screen min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div className="login-orbit login-orbit-one" /><div className="login-orbit login-orbit-two" />
    <div className="login-card relative w-full max-w-md rounded-[2rem] p-6 sm:p-8">
      <div className="text-center mb-6"><BrandLogo showTagline className="login-brand" /><p className="login-kicker">Seu universo de leitura</p></div>
      <div className="mb-5 p-3 rounded-xl bg-white/[.035] border border-white/10 flex items-start gap-2.5 text-xs text-[#c8c0b9]"><ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" /><span>Explore o acervo. Após o cadastro, libere a leitura com acesso vitalício.</span></div>
      <form onSubmit={submit} className="space-y-4">
        {!isRecoveryLink && <label className="block text-xs font-semibold text-slate-300">E-mail<input className="admin-field mt-1" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>}
        {mode !== "recovery" && <label className="block text-xs font-semibold text-slate-300">{isRecoveryLink ? "Nova senha" : "Senha"}<div className="relative mt-1"><input className="admin-field pr-10" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required /><Lock className="absolute right-3 top-3 w-4 h-4 text-slate-500" /></div></label>}
        {(mode === "signup" || isRecoveryLink) && <label className="block text-xs font-semibold text-slate-300">Confirmar senha<input className="admin-field mt-1" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></label>}
        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
        {notice && <p role="status" className="text-xs text-emerald-400">{notice}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full font-bold" disabled={busy}>{busy ? "Aguarde..." : isRecoveryLink ? "Definir nova senha" : mode === "signup" ? "Criar conta" : mode === "recovery" ? "Enviar link" : "Entrar"}<ArrowRight className="w-4 h-4 ml-2" /></Button>
      </form>
      {!isRecoveryLink && <div className="flex flex-wrap gap-3 justify-center mt-5 text-xs text-amber-300"><button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}>{mode === "signup" ? "Já tenho conta" : "Criar conta"}</button><button onClick={() => { setMode(mode === "recovery" ? "login" : "recovery"); setError(""); }}>{mode === "recovery" ? "Voltar ao login" : "Esqueci minha senha"}</button></div>}
    </div>
  </div>;
};
