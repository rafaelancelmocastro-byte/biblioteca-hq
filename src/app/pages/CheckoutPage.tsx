import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Check, Copy, MessageCircle } from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { makePixCode, type CheckoutSettings } from "../../services/pix";

export function CheckoutPage({ email, onBack }: { email: string; onBack: () => void }) {
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { void supabase?.from("app_settings").select("lifetime_price_cents,pix_key,pix_merchant_name,pix_merchant_city,whatsapp_number").eq("id", true).maybeSingle().then(({ data }) => setSettings(data as CheckoutSettings | null)); }, []);
  const code = settings ? makePixCode(settings) : "";
  useEffect(() => { if (code) void QRCode.toDataURL(code, { width: 340, margin: 2, color: { dark: "#17120e", light: "#ffffff" } }).then(setQr); }, [code]);
  const whatsapp = settings?.whatsapp_number.replace(/\D/g, "") || "";
  const message = `Olá! Acabei de me cadastrar com o e-mail ${email} e gostaria de enviar o comprovante do PIX para liberar meu acesso vitalício à Biblioteca HQ.`;
  return <div className="min-h-dvh bg-[#0f0f11] text-white px-4 py-8 flex justify-center items-start"><div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#1d1714] p-5 sm:p-8 shadow-2xl">
    <button onClick={onBack} className="flex items-center gap-2 text-sm text-amber-300 mb-6"><ArrowLeft className="w-4 h-4" /> Voltar à biblioteca</button>
    <p className="text-xs uppercase tracking-[.2em] text-amber-400 font-bold">Acesso vitalício</p><h1 className="font-serif text-4xl mt-2">Leia todo o acervo</h1>
    <p className="text-slate-300 text-sm mt-3">Pagamento único de <strong className="text-white">{settings ? (settings.lifetime_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 29,99"}</strong>. Após enviar o comprovante, o Master libera seu acesso.</p>
    {code ? <div className="mt-7 space-y-4"><div className="flex justify-center">{qr && <img src={qr} alt="QR Code PIX para o acesso vitalício" width="260" height="260" className="rounded-xl bg-white p-2" />}</div><div className="break-all rounded-xl bg-black/30 p-3 text-xs text-slate-300">{code}</div><button className="studio-primary" onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check /> : <Copy />} {copied ? "Código copiado" : "Copiar PIX Copia e Cola"}</button><p className="text-center text-xs text-slate-400">Chave PIX: {settings?.pix_key}</p></div> : <p className="mt-6 text-sm text-amber-300">O pagamento será disponibilizado em breve.</p>}
    {whatsapp && <a className="mt-5 studio-primary" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> Enviar comprovante pelo WhatsApp</a>}
    <p className="text-xs text-slate-500 mt-5">O acesso depende de conferência manual do comprovante. Não inclua dados sensíveis além do necessário.</p>
  </div></div>;
}
