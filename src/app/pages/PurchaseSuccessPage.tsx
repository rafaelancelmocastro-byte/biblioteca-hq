import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";

export function PurchaseSuccessPage({ onLogin }: { onLogin: () => void }) {
  return <div className="login-screen min-h-dvh flex items-center justify-center p-4">
    <main className="login-card w-full max-w-lg rounded-[2rem] p-6 text-center sm:p-8">
      <BrandLogo showTagline className="login-brand" />
      <div className="mx-auto mt-7 grid h-14 w-14 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10"><CheckCircle2 className="h-7 w-7 text-emerald-300" /></div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#8fa2b8]">Compra recebida</p>
      <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Agora falta só criar sua senha.</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">Assim que a Lastlink confirmar o pagamento, enviaremos o convite de ativação para o <strong className="text-white">mesmo e-mail usado na compra</strong>.</p>
      <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[.025] p-4"><Mail className="mb-2 h-5 w-5 text-[#a8bacf]" /><strong className="block text-sm text-white">Confira seu e-mail</strong><span className="mt-1 block text-xs leading-5 text-slate-400">O convite pode levar alguns instantes após a confirmação do pagamento.</span></div>
        <div className="rounded-xl border border-white/8 bg-white/[.025] p-4"><ShieldCheck className="mb-2 h-5 w-5 text-[#a8bacf]" /><strong className="block text-sm text-white">Acesso protegido</strong><span className="mt-1 block text-xs leading-5 text-slate-400">Sem pagamento confirmado, nenhuma nova conta recebe acesso ao acervo.</span></div>
      </div>
      <button type="button" className="studio-primary mt-6 w-full" onClick={onLogin}>Já recebi o convite / Entrar</button>
      <p className="mt-3 text-xs text-slate-500">Se pagou por PIX, aguarde a confirmação automática da Lastlink antes de tentar entrar.</p>
    </main>
  </div>;
}
