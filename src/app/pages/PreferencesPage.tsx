import React, { useEffect, useState } from "react";
import { BookOpen, Download, LibraryBig, Monitor, Navigation, Save, ShieldCheck } from "lucide-react";
import {
  DEFAULT_USER_PREFERENCES,
  loadUserPreferences,
  saveUserPreferences,
  type UserPreferences,
} from "../../services/userPreferences";

export const PreferencesPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void loadUserPreferences(userId).then((value) => {
      if (!active) return;
      setPrefs(value);
      setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) =>
    setPrefs((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage("");
    await saveUserPreferences(userId, prefs);
    setSaving(false);
    setMessage(navigator.onLine ? "Preferências salvas e sincronizadas com sua conta." : "Preferências salvas neste dispositivo. Serão sincronizadas quando houver conexão.");
  };

  if (loading) return <div className="empty-collection-kind" role="status">Carregando preferências...</div>;

  return (
    <div className="streaming-page preferences-page space-y-8 sm:space-y-10">
      <header className="px-1 pt-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Sua conta</span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Preferências</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
          Personalize leitura e navegação. Estas preferências acompanham sua conta entre dispositivos.
        </p>
      </header>

      <div className="preferences-grid">
        <section className="preferences-card">
          <div className="preferences-card-heading"><BookOpen /><div><h2>Leitura</h2><p>Defina como novas leituras devem abrir.</p></div></div>
          <div className="preferences-fields">
            <label>Modo padrão
              <select value={prefs.readerMode} onChange={(e) => update("readerMode", e.target.value as UserPreferences["readerMode"])}>
                <option value="page">Página</option>
                <option value="spread">Página dupla</option>
                <option value="continuous">Rolagem vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </label>
            <label>Ajuste da página
              <select value={prefs.readerFit} onChange={(e) => update("readerFit", e.target.value as UserPreferences["readerFit"])}>
                <option value="height">Ajustar à altura</option>
                <option value="width">Ajustar à largura</option>
              </select>
            </label>
            <label>Sentido padrão
              <select value={prefs.readingDirection} onChange={(e) => update("readingDirection", e.target.value as UserPreferences["readingDirection"])}>
                <option value="auto">Automático pela publicação</option>
                <option value="ltr">Esquerda → direita</option>
                <option value="rtl">Direita → esquerda</option>
              </select>
            </label>
          </div>
        </section>


        <section className="preferences-card">
          <div className="preferences-card-heading"><LibraryBig /><div><h2>Biblioteca</h2><p>Defina como o catálogo deve aparecer por padrão.</p></div></div>
          <div className="preferences-fields">
            <label>Ordenação padrão
              <select value={prefs.librarySort} onChange={(e) => update("librarySort", e.target.value as UserPreferences["librarySort"])}>
                <option value="added_at_desc">Adicionadas recentemente</option>
                <option value="last_read_desc">Lidas recentemente</option>
                <option value="title_asc">Título A–Z</option>
                <option value="title_desc">Título Z–A</option>
                <option value="year_desc">Ano mais recente</option>
                <option value="year_asc">Ano mais antigo</option>
                <option value="issue_asc">Número da edição</option>
              </select>
            </label>
            <label>Densidade dos cards
              <select value={prefs.cardDensity} onChange={(e) => update("cardDensity", e.target.value as UserPreferences["cardDensity"])}>
                <option value="comfortable">Confortável</option>
                <option value="compact">Compacta</option>
              </select>
            </label>
          </div>
          <label className="preferences-toggle">
            <span><strong>Ocultar concluídas no catálogo</strong><small>As edições concluídas continuam acessíveis ao selecionar esse status nos filtros.</small></span>
            <input type="checkbox" checked={prefs.hideCompleted} onChange={(e) => update("hideCompleted", e.target.checked)} />
          </label>
        </section>

        <section className="preferences-card">
          <div className="preferences-card-heading"><Navigation /><div><h2>Navegação</h2><p>Escolha para onde o app deve levar você primeiro.</p></div></div>
          <div className="preferences-fields">
            <label>Tela inicial
              <select value={prefs.homeSection} onChange={(e) => update("homeSection", e.target.value as UserPreferences["homeSection"])}>
                <option value="/biblioteca">Biblioteca</option>
                <option value="/continuar">Continuar lendo</option>
                <option value="/lancamentos">Lançamentos</option>
                <option value="/series">Séries & sagas</option>
                <option value="/favoritos">Favoritos</option>
              </select>
            </label>
          </div>
        </section>

        <section className="preferences-card">
          <div className="preferences-card-heading"><Download /><div><h2>Offline</h2><p>Controle confirmações antes de downloads em conexão móvel.</p></div></div>
          <label className="preferences-toggle">
            <span><strong>Confirmar downloads em rede móvel</strong><small>Evita downloads grandes sem confirmação quando o navegador identifica conexão celular.</small></span>
            <input type="checkbox" checked={prefs.confirmMobileDownloads} onChange={(e) => update("confirmMobileDownloads", e.target.checked)} />
          </label>
        </section>

        <section className="preferences-card">
          <div className="preferences-card-heading"><Monitor /><div><h2>Interface</h2><p>O tema da Biblioteca HQ permanece escuro por enquanto.</p></div></div>
          <div className="preferences-theme-row"><span>Tema</span><strong>Escuro</strong></div>
          <label className="preferences-toggle">
            <span><strong>Reduzir animações</strong><small>Diminui transições e movimentos da interface.</small></span>
            <input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => update("reduceMotion", e.target.checked)} />
          </label>
          <label className="preferences-toggle">
            <span><strong>Reduzir transparências</strong><small>Usa superfícies mais sólidas e menos blur.</small></span>
            <input type="checkbox" checked={prefs.reduceTransparency} onChange={(e) => update("reduceTransparency", e.target.checked)} />
          </label>
        </section>

        <section className="preferences-card preferences-sync-card">
          <div className="preferences-card-heading"><ShieldCheck /><div><h2>Sincronização</h2><p>As preferências ficam associadas à sua conta e mantêm um cache local para uso offline.</p></div></div>
          <p className="preferences-sync-copy">Downloads continuam armazenados por dispositivo; preferências e progresso acompanham sua conta.</p>
        </section>
      </div>

      <div className="preferences-save-bar">
        <div>{message && <span role="status">{message}</span>}</div>
        <button type="button" onClick={() => void save()} disabled={saving}>
          <Save /> {saving ? "Salvando..." : "Salvar preferências"}
        </button>
      </div>
    </div>
  );
};
