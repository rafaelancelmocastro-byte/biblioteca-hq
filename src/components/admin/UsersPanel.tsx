import { useEffect, useMemo, useState } from "react";
import { Check, Search, Shield, Users } from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import type { AccessProfile } from "../../hooks/useAuth";
import type { CheckoutSettings } from "../../services/pix";

export function UsersPanel() {
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selfId, setSelfId] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    if (!supabase) return;
    const [people, checkout, auth] = await Promise.all([supabase.from("profiles").select("id,email,role,access_status,is_active").order("created_at", { ascending: false }), supabase.from("app_settings").select("lifetime_price_cents,pix_key,pix_merchant_name,pix_merchant_city,whatsapp_number").eq("id", true).maybeSingle(), supabase.auth.getSession()]);
    if (people.error) setMessage(people.error.message); else setProfiles((people.data || []) as AccessProfile[]);
    if (checkout.data) setSettings(checkout.data as CheckoutSettings);
    setSelfId(auth.data.session?.user.id || "");
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); const channel = supabase?.channel("master-profile-changes").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load()).subscribe(); return () => { window.clearInterval(timer); if (channel) void supabase?.removeChannel(channel); }; }, []);
  const filtered = useMemo(() => profiles.filter((person) => person.email.toLowerCase().includes(search.toLowerCase()) && (status === "all" || person.access_status === status)), [profiles, search, status]);
  const setAccess = async (person: AccessProfile, enabled: boolean) => {
    if (!supabase || person.id === selfId) return;
    const update = enabled ? { access_status: "lifetime", is_active: true } : { access_status: "blocked", is_active: false };
    const { error } = await supabase.from("profiles").update(update).eq("id", person.id);
    if (error) setMessage(error.message); else { setMessage(enabled ? `Acesso vitalício liberado para ${person.email}.` : `Acesso bloqueado para ${person.email}.`); await load(); }
  };
  const saveSettings = async () => {
    if (!supabase || !settings) return;
    const { error } = await supabase.from("app_settings").update(settings).eq("id", true);
    setMessage(error ? error.message : "Dados do checkout PIX atualizados.");
  };
  return <div className="space-y-5">
    {message && <p role="status" className="studio-notice"><Check /> {message}</p>}
    <section className="studio-panel"><div className="studio-panel-title"><div><span>Controle de acesso</span><h2>Usuários</h2></div><strong>{profiles.length}</strong></div>
      <div className="flex flex-wrap gap-3 mb-4"><label className="flex-1 min-w-[13rem] relative"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input className="admin-field !pl-9" type="search" placeholder="Buscar por e-mail" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="admin-field !w-auto" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos</option><option value="pending_payment">Pendentes</option><option value="lifetime">Vitalícios</option><option value="blocked">Bloqueados</option></select></div>
      <div className="space-y-2">{filtered.map((person) => <article key={person.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="min-w-0"><strong className="text-sm text-white break-all">{person.email}</strong><p className="text-xs text-slate-400">{person.role === "master" ? "Master" : person.access_status === "pending_payment" ? "Pagamento pendente" : person.access_status === "lifetime" ? "Acesso vitalício" : "Bloqueado"}</p></div>{person.role === "master" ? <Shield className="w-5 h-5 text-amber-300" /> : <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="checkbox" role="switch" aria-label={`Liberar acesso vitalício para ${person.email}`} checked={person.access_status === "lifetime" && person.is_active} onChange={(event) => void setAccess(person, event.target.checked)} className="accent-amber-400 w-5 h-5" /> Liberar acesso vitalício</label>}</article>)}{filtered.length === 0 && <p className="text-sm text-slate-400">Nenhum usuário neste filtro.</p>}</div>
    </section>
    {settings && <section className="studio-panel"><div className="studio-panel-title"><div><span>Pagamento manual</span><h2>Checkout PIX</h2></div><Users className="text-amber-400" /></div><div className="form-grid"><label>Valor vitalício (R$)<input className="admin-field" type="number" step="0.01" min="0.01" value={(settings.lifetime_price_cents / 100).toFixed(2)} onChange={(event) => setSettings({ ...settings, lifetime_price_cents: Math.round(Number(event.target.value) * 100) })} /></label><label>Chave PIX<input className="admin-field" value={settings.pix_key} onChange={(event) => setSettings({ ...settings, pix_key: event.target.value })} /></label><label>Nome do recebedor<input className="admin-field" value={settings.pix_merchant_name} onChange={(event) => setSettings({ ...settings, pix_merchant_name: event.target.value })} /></label><label>Cidade do recebedor<input className="admin-field" value={settings.pix_merchant_city} onChange={(event) => setSettings({ ...settings, pix_merchant_city: event.target.value })} /></label><label className="span-2">WhatsApp com DDI<input className="admin-field" value={settings.whatsapp_number} onChange={(event) => setSettings({ ...settings, whatsapp_number: event.target.value })} /></label></div><button className="studio-primary mt-5" onClick={() => void saveSettings()}>Salvar pagamento</button></section>}
  </div>;
}
