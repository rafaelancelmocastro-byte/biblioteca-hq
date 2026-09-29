import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";

type Props = { email: string; onBack: () => void; requiresEmailConfirmation?: boolean; blocked?: boolean };

const CHECKOUT_URL = "https://lastlink.com/p/C95A90981/checkout-payment/";

export function CheckoutPage({ email, onBack, blocked = false }: Props) {
  const openCheckout = () => {
    const url = new URL(CHECKOUT_URL);
    if (email) url.searchParams.set("email", email);
    url.searchParams.set("utm_source", "bibliotecahq");
    url.searchParams.set("utm_medium", "app");
    url.searchParams.set("utm_campaign", "acesso_vitalicio");
    window.location.href = url.toString();
  };

  return <div className="min-h-dvh bg-[#0b0f15] text-white px-4 py-8 flex justify-center items-start">
    <main className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#11161d] p-5 sm:p-8 shadow-2xl">
      <BrandLogo />
      <button type="button" onClick={onBack} className="mt-6 mb-5 flex items-center gap-2 text-sm text-[#a8bacf]"><ArrowLeft className="w-4 h-4" /> Voltar</button>
      {blocked ? <>
        <p className="text-xs uppercase tracking-[.2em] text-rose-300 font-bold">Acesso indisponível</p>
        <h1 className="mt-2 text-3xl font-bold">Esta conta está bloqueada</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Se houve reembolso ou chargeback, o acesso é removido automaticamente. Não faça uma nova compra sem antes confirmar a situação da conta.</p>
      </> : <>
        <p className="text-xs uppercase tracking-[.2em] text-[#8fa2b8] font-bold">Acesso vitalício · pagamento único</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Finalize pela Lastlink</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">O pagamento não é conferido manualmente. Assim que a Lastlink confirmar a compra, o acesso da conta <strong className="break-all text-white">{email || "informada no checkout"}</strong> será liberado automaticamente.</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <span className="text-xs text-slate-400">Pagamento único</span>
          <strong className="mt-1 block text-3xl text-white">R$ 19,99</strong>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>• Checkout e confirmação pela Lastlink</li>
            <li>• Cartão ou PIX conforme disponibilidade no checkout</li>
            <li>• Liberação automática após pagamento confirmado</li>
          </ul>
        </div>
        <button type="button" className="studio-primary mt-6 w-full" onClick={openCheckout}>Ir para o checkout seguro <ArrowRight /></button>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#a8bacf]/20 bg-[#a8bacf]/5 p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#a8bacf]" />A Biblioteca HQ não solicita comprovante por WhatsApp. Use somente o checkout oficial da Lastlink.</div>
      </>}
    </main>
  </div>;
}
