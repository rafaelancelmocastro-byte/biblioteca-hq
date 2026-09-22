import React, { useState } from "react";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { APP_CONFIG } from "../../config/app";
import { Button } from "../../components/ui/Button";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";
import { BrandLogo } from "../../components/ui/BrandLogo";

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [isInviteFlow] = useState(() =>
    window.location.hash.includes("type=invite") || window.location.hash.includes("type=recovery")
  );
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured || !supabase) {
      // Mantém o protótipo utilizável antes da configuração do ambiente local.
      onSuccess();
      return;
    }

    if (!password || password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (isInviteFlow && password !== passwordConfirmation) {
      setError("A confirmação da senha não corresponde.");
      return;
    }

    setIsSubmitting(true);
    if (isInviteFlow) {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      setIsSubmitting(false);
      if (updateError) {
        setError("Não foi possível definir sua senha. Abra novamente o link do convite.");
        return;
      }
      window.history.replaceState({}, "", "/login");
      onSuccess();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: APP_CONFIG.ownerEmail,
      password,
    });
    setIsSubmitting(false);

    if (signInError) {
      setError("Não foi possível autenticar. Confira seu e-mail e sua senha.");
      return;
    }

    onSuccess();
  };

  const handlePasswordRecovery = async () => {
    if (!supabase) return;
    setError("");
    setNotice("");
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(APP_CONFIG.ownerEmail, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (recoveryError) {
      setError("Não foi possível enviar o link agora. Tente novamente em alguns minutos.");
      return;
    }
    setNotice("Enviamos um link seguro para você criar ou redefinir sua senha.");
  };

  return (
    <div className="login-screen min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="login-orbit login-orbit-one" />
      <div className="login-orbit login-orbit-two" />
      <div className="login-card relative w-full max-w-md rounded-[2rem] p-6 sm:p-8">
        {/* Logo & Marca */}
        <div className="text-center mb-6">
          <BrandLogo showTagline className="login-brand" />
          <p className="login-kicker">Streaming privado de quadrinhos</p>
        </div>

        {/* Mensagem de Segurança */}
        <div className="mb-6 p-3 rounded-xl bg-white/[.035] border border-white/10 flex items-start gap-2.5 text-xs text-[#c8c0b9]">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Acesso restrito ao proprietário da biblioteca (<strong className="text-amber-400 font-semibold">{APP_CONFIG.ownerEmail}</strong>). Cadastro público desabilitado por diretiva de privacidade.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-owner-email"
              className="text-xs font-semibold text-slate-300 block mb-1"
            >
              Identificação do Dono
            </label>
            <input
              id="login-owner-email"
              type="text"
              readOnly
              value={APP_CONFIG.ownerEmail}
              className="w-full h-10 px-3 bg-[#0d1017] text-xs text-slate-400 border border-slate-800 rounded-lg cursor-not-allowed select-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="login-password-input"
                className="text-xs font-semibold text-slate-300"
              >
                {isInviteFlow ? "Crie sua senha" : "Senha"}
              </label>
              <span className="text-[10px] text-amber-400/80 font-mono">
                {isSupabaseConfigured ? "Supabase Ativo" : "Modo Protótipo"}
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                id="login-password-input"
                type="password"
                placeholder={isInviteFlow ? "Mínimo de 8 caracteres" : "Insira sua senha"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-3 pr-9 bg-[#0d1017] text-xs sm:text-sm text-slate-200 border border-slate-700 rounded-lg focus:border-amber-500 focus:outline-none"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
            </div>
          </div>

          {isInviteFlow && (
            <div>
              <label htmlFor="login-password-confirmation" className="text-xs font-semibold text-slate-300 block mb-1">
                Confirme sua senha
              </label>
              <input
                id="login-password-confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="w-full h-10 px-3 bg-[#0d1017] text-xs sm:text-sm text-slate-200 border border-slate-700 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}
          {notice && <p className="text-xs text-emerald-400">{notice}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full font-bold shadow-lg shadow-amber-500/20 mt-2"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? "Processando..." : isInviteFlow ? "Definir senha e entrar" : "Acessar Meu Acervo"}</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {!isInviteFlow && isSupabaseConfigured && (
            <button
              type="button"
              onClick={handlePasswordRecovery}
              className="w-full text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              Criar ou redefinir minha senha por e-mail
            </button>
          )}
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-mono">
          Biblioteca HQ • Versão {APP_CONFIG.version}
        </div>
      </div>
    </div>
  );
};
