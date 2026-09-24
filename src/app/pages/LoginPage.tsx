import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";
import { CheckoutPage } from "./CheckoutPage";

const AUTH_REDIRECT_URL = "https://biblioteca-hq.vercel.app/login";
const RECOVERY_REDIRECT_URL = "https://biblioteca-hq.vercel.app/redefinir-senha";
const initialLinkError = () => {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("error_code") || hash.get("error_code") || (query.get("error") || hash.get("error") ? "invalid_link" : "");
};

export const LoginPage: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const onSuccessRef = useRef(onSuccess);
  const redirectedRef = useRef(false);
  onSuccessRef.current = onSuccess;
  const finishLogin = () => { if (redirectedRef.current) return; redirectedRef.current = true; onSuccessRef.current(); };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [linkError, setLinkError] = useState(initialLinkError);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return;
      if (event === "SIGNED_IN" && session && !initialLinkError()) finishLogin();
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session && !initialLinkError()) finishLogin();
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const resendConfirmation = async () => {
    if (!supabase || !email.trim()) { setError("Informe seu e-mail para receber um novo link."); return; }
    setBusy(true); setError("");
    try {
      const { error: failure } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: AUTH_REDIRECT_URL } });
      if (failure) throw failure;
      setNotice("Enviamos um novo link de confirmação. Abra o e-mail mais recente.");
      setLinkError("");
      window.history.replaceState({}, "", "/login");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível reenviar. Tente novamente."); }
    finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!supabase || !isSupabaseConfigured) { setError("Autenticação indisponível."); return; }
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    if (mode !== "recovery" && password.length < 8) { setError("A senha deve ter ao menos 8 caracteres."); return; }
    if (mode === "signup" && password !== confirmation) { setError("As senhas não conferem."); return; }
    setBusy(true);
    try {
      if (mode === "recovery") {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RECOVERY_REDIRECT_URL });
        if (failure) throw failure;
        setNotice("Se este e-mail estiver cadastrado, você receberá um link para escolher uma nova senha. Confira também a pasta de spam."); return;
      }
      if (mode === "signup") {
        const { data, error: failure } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: AUTH_REDIRECT_URL } });
        if (failure) throw failure;
        if (data.session) finishLogin();
        else setRegisteredEmail(email.trim());
        return;
      }
      const { error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (failure) throw failure;
      finishLogin();
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Não foi possível concluir. Tente novamente.";
      setError(/Email not confirmed/i.test(message) ? "Confirme seu e-mail antes de entrar. Se o link venceu, reenvie a confirmação abaixo."
        : /Email address not authorized|rate limit|email.*send|smtp/i.test(message) ? "Não foi possível enviar o e-mail de confirmação agora. Não faça o PIX até receber e confirmar o link. Tente novamente mais tarde."
        : message);
    }
    finally { setBusy(false); }
  };

  if (registeredEmail) return <CheckoutPage email={registeredEmail} requiresEmailConfirmation onBack={() => { setRegisteredEmail(""); setMode("login"); setPassword(""); setConfirmation(""); }} />;

  return <div className="login-screen min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div className="login-orbit login-orbit-one" /><div className="login-orbit login-orbit-two" />
    <div className="login-card relative w-full max-w-md rounded-[2rem] p-6 sm:p-8">
      <div className="text-center mb-6"><BrandLogo showTagline className="login-brand" /><p className="login-kicker">Seu universo de leitura</p></div>
      <div className="mb-5 p-3 rounded-xl bg-white/[.035] border border-white/10 flex items-start gap-2.5 text-xs text-[#b8c2cd]"><ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" /><span>Crie sua conta e confirme o e-mail. O PIX e o WhatsApp oficiais aparecem na próxima etapa; a leitura é liberada após conferência manual do pagamento.</span></div>
      {linkError && <p role="alert" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">O link de confirmação expirou ou já foi usado. Informe o e-mail cadastrado e peça um novo link abaixo.</p>}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-300">E-mail<input className="admin-field mt-1" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {mode !== "recovery" && <label className="block text-xs font-semibold text-slate-300">Senha<div className="relative mt-1"><input className="admin-field pr-10" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required /><Lock className="absolute right-3 top-3 w-4 h-4 text-slate-500" /></div></label>}
        {mode === "signup" && <label className="block text-xs font-semibold text-slate-300">Confirmar senha<input className="admin-field mt-1" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></label>}
        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
        {notice && <p role="status" className="text-xs text-emerald-400">{notice}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full font-bold" disabled={busy}>{busy ? "Aguarde..." : mode === "signup" ? "Criar conta" : mode === "recovery" ? "Enviar link" : "Entrar"}<ArrowRight className="w-4 h-4 ml-2" /></Button>
      </form>
      {(mode === "signup" || linkError || /Confirme seu e-mail/.test(error)) && <button type="button" className="mt-4 w-full text-center text-xs text-amber-300 underline underline-offset-4 disabled:opacity-50" onClick={() => void resendConfirmation()} disabled={busy}>Reenviar e-mail de confirmação</button>}
      <div className="flex flex-wrap gap-3 justify-center mt-5 text-xs text-amber-300"><button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}>{mode === "signup" ? "Já tenho conta" : "Criar conta"}</button><button onClick={() => { setMode(mode === "recovery" ? "login" : "recovery"); setError(""); }}>{mode === "recovery" ? "Voltar ao login" : "Esqueci minha senha"}</button></div>
    </div>
  </div>;
};
