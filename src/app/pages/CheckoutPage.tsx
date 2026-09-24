import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Check, Copy, MessageCircle, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { makePixCode, type CheckoutSettings } from "../../services/pix";

type Props = { email: string; onBack: () => void; requiresEmailConfirmation?: boolean; blocked?: boolean };

export function CheckoutPage({ email, onBack, requiresEmailConfirmation = false, blocked = false }: Props) {
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState<"key" | "code" | "">("");
  useEffect(() => {
    let active = true;
    void fetch("/api/health?checkout=1").then(async (response) => {
      if (!response.ok) throw new Error("Não foi possível carregar os dados oficiais do pagamento. Tente novamente mais tarde.");
      return response.json() as Promise<CheckoutSettings>;
    }).then((data) => { if (active) setSettings(data); }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : "Dados do pagamento indisponíveis."); });
    return () => { active = false; };
  }, []);
  const code = settings ? makePixCode(settings) : "";
  useEffect(() => { if (code) void QRCode.toDataURL(code, { width: 340, margin: 2, color: { dark: "#101820", light: "#ffffff" } }).then(setQr).catch(() => setQr("")); }, [code]);
  const whatsapp = settings?.whatsapp_number.replace(/\D/g, "") || "";
  const whatsappDisplay = /^55\d{11}$/.test(whatsapp) ? `+55 (${whatsapp.slice(2, 4)}) ${whatsapp.slice(4, 9)}-${whatsapp.slice(9)}` : `+${whatsapp}`;
  const message = `Olá! Sou ${email}. Quero enviar o comprovante do PIX de acesso vitalício à Biblioteca HQ para conferência.`;
  const copy = async (value: string, field: "key" | "code") => {
    try { await navigator.clipboard.writeText(value); setCopied(field); window.setTimeout(() => setCopied(""), 2500); }
    catch { setLoadError("Não foi possível copiar. Selecione o texto e copie manualmente."); }
  };

  return <div className="min-h-dvh bg-[#0f0f11] text-white px-4 py-8 flex justify-center items-start"><main className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#171b21] p-5 sm:p-8 shadow-2xl">
    <BrandLogo compact />
    <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-[#a8bacf] mt-6 mb-5"><ArrowLeft className="w-4 h-4" /> {requiresEmailConfirmation ? "Voltar ao login" : "Sair da conta"}</button>
    {blocked ? <><p className="text-xs uppercase tracking-[.2em] text-rose-300 font-bold">Acesso indisponível</p><h1 className="font-serif text-3xl mt-2">Sua conta está bloqueada</h1><p className="text-slate-300 text-sm mt-3">Não faça um novo pagamento. Entre em contato e informe o e-mail da conta.</p>{settings?.whatsapp_number && <a className="studio-primary w-full mt-5" href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Preciso de ajuda com a conta ${email} da Biblioteca HQ.`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> Falar com o suporte pelo WhatsApp</a>}</> : <>
      <p className="text-xs uppercase tracking-[.2em] text-[#ffb81f] font-bold">Acesso vitalício · pagamento único</p><h1 className="font-serif text-3xl sm:text-4xl mt-2">Ative sua leitura</h1>
      <p className="text-slate-300 text-sm mt-3">Sua conta <strong className="text-white break-all">{email}</strong> foi criada. O acesso ao acervo começa após a confirmação do e-mail e a conferência manual do pagamento pelo responsável da Biblioteca HQ.</p>
      <ol className="mt-5 space-y-2 text-sm text-slate-200 list-decimal pl-5"><li>Confirme seu endereço pelo link enviado por e-mail.</li><li>Pague o valor abaixo por PIX e confira o nome do recebedor no aplicativo do seu banco.</li><li>Envie o comprovante pelo botão de WhatsApp e informe o e-mail desta conta.</li><li>Após a conferência do pagamento, seu acesso será liberado no sistema. Entre com a senha que você criou.</li></ol>
      {requiresEmailConfirmation && <p role="status" className="mt-5 rounded-xl border border-[#ffb81f]/40 bg-[#ffb81f]/10 p-3 text-sm text-[#ffe1a2]">Confira seu e-mail antes de pagar. Se o link expirou, peça um novo na tela de login.</p>}
      {loadError && <p role="alert" className="mt-5 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-200">{loadError}</p>}
      {!settings && !loadError && <p role="status" className="mt-5 text-sm text-slate-400">Carregando os dados oficiais do pagamento...</p>}
      {settings && <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3"><div><span className="text-xs text-slate-400">Valor único</span><strong className="block text-2xl">{(settings.lifetime_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div><div><span className="text-xs text-slate-400">Chave PIX oficial</span><div className="flex items-center gap-2"><strong className="min-w-0 break-all text-sm">{settings.pix_key}</strong><button type="button" className="catalog-secondary-action shrink-0" onClick={() => void copy(settings.pix_key, "key")}>{copied === "key" ? <Check /> : <Copy />} {copied === "key" ? "Copiada" : "Copiar"}</button></div></div><p className="text-xs text-slate-300">Recebedor: <strong className="text-white">{settings.pix_merchant_name}</strong> · {settings.pix_merchant_city}</p></div>}
      {code && <div className="mt-5 space-y-3"><div className="flex justify-center">{qr && <img src={qr} alt="QR Code PIX do acesso vitalício" width="220" height="220" className="rounded-xl bg-white p-2" />}</div><button type="button" className="studio-primary w-full" onClick={() => void copy(code, "code")}>{copied === "code" ? <Check /> : <Copy />} {copied === "code" ? "Código copiado" : "Copiar PIX Copia e Cola"}</button></div>}
      {whatsapp && <><a className="mt-3 studio-primary w-full" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> Enviar comprovante pelo WhatsApp</a><p className="mt-2 text-center text-xs text-slate-400">WhatsApp oficial: {whatsappDisplay}</p></>}
      {settings && <div className="mt-5 rounded-xl border border-[#a8bacf]/30 bg-[#a8bacf]/5 p-3 text-xs text-slate-300"><ShieldCheck className="inline h-4 w-4 mr-1 text-[#a8bacf]" /><strong className="text-white">Confira antes de pagar:</strong> use somente os dados desta página em <strong>biblioteca-hq.vercel.app</strong>. Confirme o recebedor no banco. Ninguém da Biblioteca HQ pedirá sua senha ou código recebido por e-mail ou WhatsApp.</div>}
      {!requiresEmailConfirmation && <p className="mt-4 text-xs text-slate-400">Já enviou o comprovante? Você pode voltar depois. Esta página mostrará o acesso assim que o Master conferir o pagamento no banco e liberar sua conta.</p>}
    </>}
  </main></div>;
}
