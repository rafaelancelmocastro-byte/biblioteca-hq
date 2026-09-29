import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";

const getOrigin = () => (typeof window !== "undefined" ? window.location.origin : "https://bibliotecahq.com.br");
const RECOVERY_REDIRECT_URL = `${getOrigin()}/redefinir-senha`;
const initialLinkError = () => {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("error_code") || hash.get("error_code") || (query.get("error") || hash.get("error") ? "invalid_link" : "");
};

export const LoginPage: React.FC<{ onSuccess: () => void; onBackToSales?: () => void }> = ({ onSuccess, onBackToSales }) => {
  const [mode, setMode] = useState<"login" | "recovery">("login");
  const onSuccessRef = useRef(onSuccess);
  const redirectedRef = useRef(false);
  onSuccessRef.current = onSuccess;
  const finishLogin = () => { if (redirectedRef.current) return; redirectedRef.current = true; onSuccessRef.current(); };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [linkError] = useState(initialLinkError);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const explicitlyLoggedOut = sessionStorage.getItem("user_logged_out") === "1";
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return;
      if (active && event === "SIGNED_IN" && session && !initialLinkError() && !explicitlyLoggedOut) finishLogin();
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session && !initialLinkError() && !explicitlyLoggedOut) finishLogin();
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!supabase || !isSupabaseConfigured) { setError("Autenticação indisponível."); return; }
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    setBusy(true);
    try {
      if (mode === "recovery") {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RECOVERY_REDIRECT_URL });
        if (failure) throw failure;
        setNotice("Se este e-mail possui acesso, você receberá um link para redefinir sua senha.");
        return;
      }
      if (password.length < 8) { setError("A senha deve ter ao menos 8 caracteres."); return; }
      const { error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (failure) throw failure;
      sessionStorage.removeItem("user_logged_out");
      finishLogin();
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Não foi possível concluir. Tente novamente.";
      setError(/Invalid login credentials/i.test(message)
        ? "E-mail ou senha inválidos. Se acabou de comprar, use primeiro o convite de ativação recebido por e-mail."
        : message);
    } finally { setBusy(false); }
  };

  return <div className="login-screen min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div className="login-orbit login-orbit-one" /><div className="login-orbit login-orbit-two" />
    <div className="login-card relative w-full max-w-md rounded-[2rem] p-6 sm:p-8">
      <div className="text-center mb-6"><BrandLogo showTagline className="login-brand" /><p className="login-kicker">Seu universo de leitura</p></div>
      <div className="mb-5 p-3 rounded-xl bg-white/[.035] border border-white/10 flex items-start gap-2.5 text-xs text-[#b8c2cd]"><ShieldCheck className="w-4 h-4 text-[#a8bacf] shrink-0" /><span>Novas contas são criadas somente após a confirmação do pagamento pela Lastlink. Já comprou? Use o convite enviado para o e-mail da compra.</span></div>
      {linkError && <p role="alert" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">Este link expirou ou já foi usado. Tente entrar com sua senha ou solicite uma redefinição.</p>}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-300">E-mail<input className="admin-field mt-1" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {mode === "login" && <label className="block text-xs font-semibold text-slate-300">Senha<div className="relative mt-1"><input className="admin-field pr-10" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><Lock className="absolute right-3 top-3 w-4 h-4 text-slate-500" /></div></label>}
        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
        {notice && <p role="status" className="text-xs text-emerald-400">{notice}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full font-bold" disabled={busy}>{busy ? "Aguarde..." : mode === "recovery" ? "Enviar link" : "Entrar"}<ArrowRight className="w-4 h-4 ml-2" /></Button>
      </form>
      <div className="flex flex-wrap gap-3 justify-center mt-5 text-xs text-[#a8bacf]">
        <button onClick={() => { setMode(mode === "recovery" ? "login" : "recovery"); setError(""); setNotice(""); }}>{mode === "recovery" ? "Voltar ao login" : "Esqueci minha senha"}</button>
        {onBackToSales && <button onClick={onBackToSales}>Conhecer a Biblioteca HQ</button>}
      </div>
    </div>
  </div>;
};
