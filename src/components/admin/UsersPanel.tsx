import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import type { AccessProfile } from "../../hooks/useAuth";

type AdminProfile = AccessProfile & {
  display_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

type PurchaseStatus = "confirmed" | "refund_requested" | "refunded" | "chargeback";

type LastlinkPurchase = {
  id: string;
  buyer_email: string;
  buyer_name: string | null;
  payment_id: string | null;
  offer_code: string | null;
  amount: number | null;
  payment_method: string | null;
  status: PurchaseStatus;
  user_id: string | null;
  created_at: string;
};

type LastlinkEvent = {
  event_name: string;
  processed_at: string;
  is_test: boolean;
};

const CHECKOUT_URL = "https://lastlink.com/p/C95A90981/checkout-payment/";
const LASTLINK_DASHBOARD_URL = "https://app.lastlink.com/";

const accessLabel = (person: AdminProfile) => {
  if (person.role === "master") return "Proprietário";
  if (!person.is_active || person.access_status === "blocked") return "Bloqueado";
  if (person.access_status === "lifetime") return "Acesso vitalício";
  return "Pendente";
};

const purchaseStatusLabel: Record<PurchaseStatus, string> = {
  confirmed: "Confirmado",
  refund_requested: "Reembolso solicitado",
  refunded: "Reembolsado",
  chargeback: "Chargeback",
};

const money = (value: number | null) =>
  typeof value === "number"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

const dateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export function UsersPanel({ section = "all" }: { section?: "all" | "users" | "payments" }) {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [purchases, setPurchases] = useState<LastlinkPurchase[]>([]);
  const [lastEvent, setLastEvent] = useState<LastlinkEvent | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selfId, setSelfId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);
  const [editTarget, setEditTarget] = useState<AdminProfile | null>(null);
  const [editDraft, setEditDraft] = useState({ display_name: "", role: "user" as "master" | "user", access_status: "lifetime" as AccessProfile["access_status"], is_active: true });
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    const [people, paymentRows, eventRows, auth] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,display_name,role,access_status,is_active,created_at,updated_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("lastlink_purchases")
        .select("id,buyer_email,buyer_name,payment_id,offer_code,amount,payment_method,status,user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("lastlink_webhook_events")
        .select("event_name,processed_at,is_test")
        .order("processed_at", { ascending: false })
        .limit(1),
      supabase.auth.getSession(),
    ]);

    if (people.error) {
      setMessage(people.error.message);
      setMessageType("error");
    } else {
      setProfiles((people.data || []) as AdminProfile[]);
    }

    if (paymentRows.error) {
      setMessage(paymentRows.error.message);
      setMessageType("error");
    } else {
      setPurchases((paymentRows.data || []) as LastlinkPurchase[]);
    }

    if (!eventRows.error) setLastEvent((eventRows.data?.[0] || null) as LastlinkEvent | null);
    setSelfId(auth.data.session?.user.id || "");
    setLoading(false);
  };

  useEffect(() => {
    void load();

    const profileChannel = supabase
      ?.channel("master-profile-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load())
      .subscribe();

    const paymentChannel = supabase
      ?.channel("master-lastlink-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lastlink_purchases" }, () => void load())
      .subscribe();

    return () => {
      if (profileChannel) void supabase?.removeChannel(profileChannel);
      if (paymentChannel) void supabase?.removeChannel(paymentChannel);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 7000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return profiles.filter((person) => {
      const matchesText =
        !normalized ||
        person.email.toLocaleLowerCase("pt-BR").includes(normalized) ||
        (person.display_name || "").toLocaleLowerCase("pt-BR").includes(normalized);
      const matchesStatus =
        status === "all" ||
        (status === "master" && person.role === "master") ||
        (status === "lifetime" && person.role !== "master" && person.access_status === "lifetime" && person.is_active) ||
        (status === "blocked" && (!person.is_active || person.access_status === "blocked")) ||
        (status === "pending_payment" && person.access_status === "pending_payment");
      return matchesText && matchesStatus;
    });
  }, [profiles, search, status]);

  const paymentSummary = useMemo(() => {
    const confirmed = purchases.filter((item) => item.status === "confirmed");
    const reversals = purchases.filter((item) => item.status !== "confirmed");
    const gross = confirmed.reduce((total, item) => total + Number(item.amount || 0), 0);
    const activeReaders = profiles.filter((person) => person.role !== "master" && person.access_status === "lifetime" && person.is_active).length;
    return { confirmed: confirmed.length, reversals: reversals.length, gross, activeReaders };
  }, [purchases, profiles]);

  const setAccess = async (person: AdminProfile, enabled: boolean) => {
    if (!supabase || person.id === selfId) return;
    setBusyId(person.id);
    const update = enabled
      ? { access_status: "lifetime" as const, is_active: true }
      : { access_status: "blocked" as const, is_active: false };
    const { error } = await supabase.from("profiles").update(update).eq("id", person.id);
    setMessageType(error ? "error" : "success");
    setMessage(error ? error.message : enabled ? `Acesso vitalício liberado para ${person.email}.` : `Acesso bloqueado para ${person.email}.`);
    if (!error) await load();
    setBusyId("");
  };

  const openEditor = (person: AdminProfile) => {
    setEditTarget(person);
    setEditDraft({
      display_name: person.display_name || "",
      role: person.role,
      access_status: person.access_status,
      is_active: person.is_active,
    });
  };

  const saveUser = async () => {
    if (!supabase || !editTarget || editTarget.id === selfId) return;
    setBusyId(editTarget.id);

    const payload = editDraft.role === "master"
      ? { display_name: editDraft.display_name.trim() || null, role: "master" as const, access_status: "lifetime" as const, is_active: true }
      : {
          display_name: editDraft.display_name.trim() || null,
          role: "user" as const,
          access_status: editDraft.access_status,
          is_active: editDraft.access_status === "lifetime" ? editDraft.is_active : false,
        };

    const { error } = await supabase.from("profiles").update(payload).eq("id", editTarget.id);
    setMessageType(error ? "error" : "success");
    setMessage(error ? error.message : `Usuário ${editTarget.email} atualizado.`);
    if (!error) {
      setEditTarget(null);
      await load();
    }
    setBusyId("");
  };

  const sendPasswordReset = async (person: AdminProfile) => {
    if (!supabase) return;
    setBusyId(person.id);
    const { error } = await supabase.auth.resetPasswordForEmail(person.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMessageType(error ? "error" : "success");
    setMessage(error ? error.message : `E-mail de redefinição enviado para ${person.email}.`);
    setBusyId("");
  };

  const deleteUser = async () => {
    if (!supabase || !deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sua sessão expirou. Entre novamente.");
      const response = await fetch("/api/comics/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ id: target.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Não foi possível excluir o usuário.");
      setDeleteTarget(null);
      setMessageType("success");
      setMessage(`Conta de ${target.email} excluída.`);
      await load();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o usuário.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-5">
      {message && (
        <div className={`admin-toast ${messageType}`} role={messageType === "error" ? "alert" : "status"}>
          {messageType === "error" ? <AlertCircle /> : <Check />}
          <span>{message}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setMessage("")}><X /></button>
        </div>
      )}

      {section !== "payments" && (
        <section className="studio-panel user-admin-panel">
          <div className="studio-panel-title">
            <div>
              <span>Controle de acesso</span>
              <h2>Usuários</h2>
            </div>
            <strong>{profiles.length}</strong>
          </div>

          <p className="user-admin-intro">
            Gerencie nome, perfil e acesso. Compras confirmadas pela Lastlink liberam o acesso automaticamente;
            reembolsos e chargebacks revogam o acesso pelo webhook.
          </p>

          <div className="user-security-note">
            <KeyRound />
            <div>
              <strong>Senhas não podem ser visualizadas.</strong>
              <span>O Supabase armazena somente hashes de senha. Como proprietário, você pode enviar uma redefinição segura por e-mail.</span>
            </div>
          </div>

          <div className="user-toolbar">
            <label className="user-search">
              <Search />
              <input
                className="admin-field"
                type="search"
                placeholder="Buscar por nome ou e-mail"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select className="admin-field" aria-label="Filtrar usuários" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Todos</option>
              <option value="master">Proprietários</option>
              <option value="lifetime">Vitalícios ativos</option>
              <option value="blocked">Bloqueados</option>
              <option value="pending_payment">Pendentes</option>
            </select>
            <button type="button" aria-label="Atualizar usuários" title="Atualizar usuários" onClick={() => void load()}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="user-list">
            {filtered.map((person) => {
              const isSelf = person.id === selfId;
              return (
                <article key={person.id} className="user-row user-row-v2">
                  <div className="user-row-main">
                    <div className={`user-avatar ${person.role === "master" ? "master" : ""}`}>
                      {person.role === "master" ? <Shield /> : <Users />}
                    </div>
                    <div className="user-row-copy">
                      <strong>{person.display_name || person.email.split("@")[0]}</strong>
                      <span>{person.email}</span>
                      <div className="user-row-meta">
                        <span className={`user-status-pill ${person.role === "master" ? "master" : person.is_active ? "active" : "blocked"}`}>
                          {accessLabel(person)}
                        </span>
                        {person.created_at && <small>Desde {new Date(person.created_at).toLocaleDateString("pt-BR")}</small>}
                        {isSelf && <small>Você</small>}
                      </div>
                    </div>
                  </div>

                  <div className="user-actions user-actions-v2">
                    <button type="button" disabled={!!busyId || isSelf} onClick={() => openEditor(person)}>
                      <UserCog /> Editar
                    </button>
                    <button type="button" disabled={!!busyId} onClick={() => void sendPasswordReset(person)}>
                      <KeyRound /> Redefinir senha
                    </button>
                    {person.role !== "master" && (
                      <button
                        type="button"
                        className={person.access_status === "lifetime" && person.is_active ? "user-delete" : "studio-primary"}
                        disabled={!!busyId || isSelf}
                        onClick={() => void setAccess(person, !(person.access_status === "lifetime" && person.is_active))}
                      >
                        {person.access_status === "lifetime" && person.is_active ? <><Ban /> Bloquear</> : <><CheckCircle2 /> Liberar</>}
                      </button>
                    )}
                    {person.role !== "master" && (
                      <button type="button" className="user-delete" disabled={!!busyId || isSelf} onClick={() => setDeleteTarget(person)}>
                        <Trash2 /> Excluir
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {filtered.length === 0 && <p className="user-empty">Nenhum usuário neste filtro.</p>}
          </div>
        </section>
      )}

      {section !== "users" && (
        <section className="studio-panel payments-v2">
          <div className="studio-panel-title">
            <div>
              <span>Automação de vendas</span>
              <h2>Pagamentos · Lastlink</h2>
            </div>
            <CreditCard />
          </div>

          <p className="user-admin-intro">
            O PIX manual saiu do fluxo. Pagamento, liberação do acesso vitalício, pedido de reembolso e chargeback
            são acompanhados pelos eventos recebidos da Lastlink.
          </p>

          <div className="payment-health">
            <div className={lastEvent ? "payment-health-dot online" : "payment-health-dot"} />
            <div>
              <strong>{lastEvent ? "Integração recebendo eventos" : "Aguardando o primeiro evento"}</strong>
              <span>{lastEvent ? `Último evento: ${lastEvent.event_name} · ${dateTime(lastEvent.processed_at)}` : "Nenhum webhook foi registrado no banco ainda."}</span>
            </div>
            <button type="button" onClick={() => void load()}><RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar</button>
          </div>

          <div className="payment-summary-grid">
            <article><span>Compras confirmadas</span><strong>{paymentSummary.confirmed}</strong><small>eventos registrados</small></article>
            <article><span>Leitores ativos</span><strong>{paymentSummary.activeReaders}</strong><small>sem contar proprietários</small></article>
            <article><span>Receita confirmada</span><strong>{money(paymentSummary.gross)}</strong><small>histórico recebido</small></article>
            <article><span>Reembolsos / reversões</span><strong>{paymentSummary.reversals}</strong><small>acessos revogados</small></article>
          </div>

          <div className="payment-links">
            <a href={CHECKOUT_URL} target="_blank" rel="noreferrer"><ExternalLink /> Abrir checkout</a>
            <a href={LASTLINK_DASHBOARD_URL} target="_blank" rel="noreferrer"><ExternalLink /> Abrir painel Lastlink</a>
          </div>

          <div className="payment-table-wrap">
            <div className="payment-table-heading">
              <div><strong>Transações recentes</strong><span>Até 100 eventos de compra/reembolso armazenados no sistema.</span></div>
              <span>{purchases.length}</span>
            </div>

            {purchases.length ? (
              <div className="payment-list">
                {purchases.map((purchase) => (
                  <article key={purchase.id} className="payment-row">
                    <div className="payment-row-person">
                      <strong>{purchase.buyer_name || purchase.buyer_email}</strong>
                      <span>{purchase.buyer_email}</span>
                    </div>
                    <div><span>Método</span><strong>{purchase.payment_method || "—"}</strong></div>
                    <div><span>Valor</span><strong>{money(purchase.amount)}</strong></div>
                    <div><span>Data</span><strong>{dateTime(purchase.created_at)}</strong></div>
                    <div className={`payment-status ${purchase.status}`}>
                      {purchaseStatusLabel[purchase.status]}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="payment-empty">
                <CreditCard />
                <strong>Nenhuma transação registrada ainda</strong>
                <span>Quando a Lastlink enviar o primeiro evento válido, ele aparecerá aqui automaticamente.</span>
              </div>
            )}
          </div>

          <div className="payment-automation-note">
            <ShieldCheck />
            <div>
              <strong>Fluxo atual</strong>
              <span>Compra confirmada → conta convidada/liberada → acesso vitalício. Reembolso, chargeback ou fim do acesso → conta bloqueada automaticamente.</span>
            </div>
          </div>
        </section>
      )}

      {editTarget && (
        <div className="admin-confirm-backdrop">
          <div className="admin-confirm-dialog user-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <div className="user-edit-heading">
              <div><span>Editar usuário</span><h2 id="edit-user-title">{editTarget.email}</h2></div>
              <button type="button" aria-label="Fechar" onClick={() => setEditTarget(null)}><X /></button>
            </div>

            <div className="user-edit-fields">
              <label>Nome de exibição
                <input className="admin-field" value={editDraft.display_name} onChange={(e) => setEditDraft({ ...editDraft, display_name: e.target.value })} />
              </label>
              <label>E-mail
                <input className="admin-field" value={editTarget.email} readOnly />
                <small>O e-mail de login não é alterado por este painel para evitar dessincronizar o Supabase Auth.</small>
              </label>
              <label>Perfil
                <select className="admin-field" value={editDraft.role} onChange={(e) => setEditDraft({ ...editDraft, role: e.target.value as "master" | "user" })}>
                  <option value="user">Usuário comum</option>
                  <option value="master">Proprietário / master</option>
                </select>
              </label>
              {editDraft.role !== "master" && (
                <label>Status de acesso
                  <select
                    className="admin-field"
                    value={editDraft.access_status}
                    onChange={(e) => {
                      const access_status = e.target.value as AccessProfile["access_status"];
                      setEditDraft({ ...editDraft, access_status, is_active: access_status === "lifetime" });
                    }}
                  >
                    <option value="lifetime">Vitalício ativo</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="pending_payment">Pendente</option>
                  </select>
                </label>
              )}
            </div>

            <div className="user-edit-warning">
              <Shield />
              <span>Promover alguém a proprietário dá acesso às ferramentas administrativas. Faça isso apenas para contas confiáveis.</span>
            </div>

            <div className="user-edit-actions">
              <button type="button" onClick={() => setEditTarget(null)} disabled={!!busyId}>Cancelar</button>
              <button type="button" className="studio-primary" onClick={() => void saveUser()} disabled={!!busyId}>
                {busyId ? "Salvando..." : "Salvar usuário"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-confirm-backdrop">
          <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
            <h2 id="delete-user-title">Excluir conta?</h2>
            <p>A conta <strong>{deleteTarget.email}</strong> será removida definitivamente, junto com favoritos e progresso vinculados. Essa ação não pode ser desfeita.</p>
            <div>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={!!busyId}>Cancelar</button>
              <button type="button" className="admin-delete-action" onClick={() => void deleteUser()} disabled={!!busyId}>
                {busyId ? "Excluindo..." : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
