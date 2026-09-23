import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, RefreshCw, Search, Shield, Trash2, Users, X } from "lucide-react";
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
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [deleteTarget, setDeleteTarget] = useState<AccessProfile | null>(null);
  const [busyId, setBusyId] = useState("");
  const load = async () => {
    if (!supabase) return;
    const [people, checkout, auth] = await Promise.all([supabase.from("profiles").select("id,email,role,access_status,is_active").order("created_at", { ascending: false }), supabase.from("app_settings").select("lifetime_price_cents,pix_key,pix_merchant_name,pix_merchant_city,whatsapp_number").eq("id", true).maybeSingle(), supabase.auth.getSession()]);
    if (people.error) { setMessage(people.error.message); setMessageType("error"); } else setProfiles((people.data || []) as AccessProfile[]);
    if (checkout.data) setSettings(checkout.data as CheckoutSettings);
    setSelfId(auth.data.session?.user.id || "");
  };
  useEffect(() => { void load(); const channel = supabase?.channel("master-profile-changes").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load()).subscribe(); return () => { if (channel) void supabase?.removeChannel(channel); }; }, []);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 7000); return () => window.clearTimeout(timer); }, [message]);
  const filtered = useMemo(() => profiles.filter((person) => person.email.toLowerCase().includes(search.toLowerCase()) && (status === "all" || person.access_status === status)), [profiles, search, status]);
  const setAccess = async (person: AccessProfile, enabled: boolean) => {
    if (!supabase || person.id === selfId) return;
    setBusyId(person.id);
    const update = enabled ? { access_status: "lifetime", is_active: true } : { access_status: "blocked", is_active: false };
    const { error } = await supabase.from("profiles").update(update).eq("id", person.id);
    setMessageType(error ? "error" : "success");
    if (error) setMessage(error.message); else { setMessage(enabled ? `Acesso vitalício liberado para ${person.email}.` : `Acesso bloqueado para ${person.email}.`); await load(); }
    setBusyId("");
  };
  const deleteUser = async () => {
    if (!supabase || !deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sua sessão expirou. Entre novamente.");
      const response = await fetch("/api/comics/delete", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ id: target.id }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Não foi possível excluir o usuário.");
      setDeleteTarget(null); setMessageType("success"); setMessage(`Conta de ${target.email} excluída.`); await load();
    } catch (error) { setMessageType("error"); setMessage(error instanceof Error ? error.message : "Não foi possível excluir o usuário."); }
    finally { setBusyId(""); }
  };
  const saveSettings = async () => {
    if (!supabase || !settings) return;
    const { error } = await supabase.from("app_settings").update(settings).eq("id", true);
    setMessageType(error ? "error" : "success");
    setMessage(error ? error.message : "Dados do checkout PIX atualizados.");
  };
  return <div className="space-y-5">
    {message && <div className={`admin-toast ${messageType}`} role={messageType === "error" ? "alert" : "status"}>{messageType === "error" ? <AlertCircle /> : <Check />}<span>{message}</span><button type="button" aria-label="Fechar aviso" onClick={() => setMessage("")}><X /></button></div>}
    <section className="studio-panel"><div className="studio-panel-title"><div><span>Controle de acesso</span><h2>Usuários</h2></div><strong>{profiles.length}</strong></div>
      <div className="user-toolbar"><label className="user-search"><Search /><input className="admin-field" type="search" placeholder="Buscar por e-mail" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="admin-field" aria-label="Filtrar usuários" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos</option><option value="pending_payment">Pendentes</option><option value="lifetime">Vitalícios</option><option value="blocked">Bloqueados</option></select><button type="button" aria-label="Atualizar usuários" title="Atualizar usuários" onClick={() => void load()}><RefreshCw /></button></div>
      <div className="user-list">{filtered.map((person) => <article key={person.id} className="user-row"><div><strong>{person.email}</strong><p>{person.role === "master" ? "Master" : person.access_status === "pending_payment" ? "Pagamento pendente" : person.access_status === "lifetime" ? "Acesso vitalício" : "Bloqueado"}</p></div>{person.role === "master" ? <Shield aria-label="Conta Master" /> : <div className="user-actions"><label><input type="checkbox" role="switch" aria-label={`Liberar acesso vitalício para ${person.email}`} checked={person.access_status === "lifetime" && person.is_active} disabled={!!busyId} onChange={(event) => void setAccess(person, event.target.checked)} /> Liberar acesso</label><button type="button" className="user-delete" disabled={!!busyId || person.id === selfId} onClick={() => setDeleteTarget(person)}><Trash2 /> Excluir</button></div>}</article>)}{filtered.length === 0 && <p className="user-empty">Nenhum usuário neste filtro.</p>}</div>
    </section>
    {settings && <section className="studio-panel"><div className="studio-panel-title"><div><span>Pagamento manual</span><h2>Checkout PIX</h2></div><Users className="text-amber-400" /></div><div className="form-grid"><label>Valor vitalício (R$)<input className="admin-field" type="number" step="0.01" min="0.01" value={(settings.lifetime_price_cents / 100).toFixed(2)} onChange={(event) => setSettings({ ...settings, lifetime_price_cents: Math.round(Number(event.target.value) * 100) })} /></label><label>Chave PIX<input className="admin-field" value={settings.pix_key} onChange={(event) => setSettings({ ...settings, pix_key: event.target.value })} /></label><label>Nome do recebedor<input className="admin-field" value={settings.pix_merchant_name} onChange={(event) => setSettings({ ...settings, pix_merchant_name: event.target.value })} /></label><label>Cidade do recebedor<input className="admin-field" value={settings.pix_merchant_city} onChange={(event) => setSettings({ ...settings, pix_merchant_city: event.target.value })} /></label><label className="span-2">WhatsApp com DDI<input className="admin-field" value={settings.whatsapp_number} onChange={(event) => setSettings({ ...settings, whatsapp_number: event.target.value })} /></label></div><button className="studio-primary mt-5" onClick={() => void saveSettings()}>Salvar pagamento</button></section>}
    {deleteTarget && <div className="admin-confirm-backdrop"><div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-user-title"><h2 id="delete-user-title">Excluir conta?</h2><p>A conta <strong>{deleteTarget.email}</strong> será removida definitivamente, junto com favoritos e progresso vinculados. Essa ação não pode ser desfeita.</p><div><button type="button" onClick={() => setDeleteTarget(null)} disabled={!!busyId}>Cancelar</button><button type="button" className="admin-delete-action" onClick={() => void deleteUser()} disabled={!!busyId}>{busyId ? "Excluindo..." : "Excluir definitivamente"}</button></div></div></div>}
  </div>;
}
