import React, { useState } from "react";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { APP_CONFIG } from "../../config/app";
import { Button } from "../../components/ui/Button";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080a0f] relative overflow-hidden">
      {/* Luz ambiente suave de fundo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#121622] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/90">
        {/* Logo & Marca */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black text-2xl shadow-xl shadow-amber-500/20 mb-3">
            HQ
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {APP_CONFIG.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Coleção Pessoal & Privada de Quadrinhos
          </p>
        </div>

        {/* Mensagem de Segurança */}
        <div className="mb-6 p-3 rounded-lg bg-[#161c2b] border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-300">
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
                {isInviteFlow ? "Crie sua senha" : "Chave de Acesso Pessoal"}
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
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-mono">
          Biblioteca HQ • Versão {APP_CONFIG.version}
        </div>
      </div>
    </div>
  );
};
