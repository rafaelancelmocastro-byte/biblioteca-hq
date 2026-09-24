import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Series } from "../../types/comic";
import { supabase } from "../../services/supabaseClient";
import { storageProvider } from "../../services/storageProvider";
import { saveSeriesRecord } from "../../services/comicAdminService";

type Props = { series: Series[]; onCreated: (id: string) => Promise<void>; onFeedback: (message: string, type: "success" | "error" | "info") => void };
const norm = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

export function ImportOrganization({ series, onCreated, onFeedback }: Props) {
  const [open, setOpen] = useState(false);
  const [publisher, setPublisher] = useState("");
  const [publisherCover, setPublisherCover] = useState<File | null>(null);
  const [collection, setCollection] = useState("");
  const [collectionCover, setCollectionCover] = useState<File | null>(null);
  const [kind, setKind] = useState("collection");
  const [child, setChild] = useState("");
  const [childCover, setChildCover] = useState<File | null>(null);
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const publishers = [...new Set(series.map((item) => item.publisher))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const existingParent = series.find((item) => !item.parentSeriesId && norm(item.publisher) === norm(publisher) && norm(item.title) === norm(collection));
  const existingChild = series.find((item) => item.parentSeriesId === existingParent?.id && norm(item.title) === norm(child));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!publisher.trim() || !collection.trim() || !/^\d{4}$/.test(year)) { onFeedback("Informe editora, coleção e ano inicial.", "error"); return; }
    setBusy(true);
    try {
      const knownPublisher = publishers.find((item) => norm(item) === norm(publisher)) || publisher.trim();
      const { data: publisherAssets } = await supabase!.from("publisher_assets").select("publisher,logo_key");
      const savedPublisher = (publisherAssets || []).find((item) => norm(item.publisher) === norm(knownPublisher));
      if (!savedPublisher || publisherCover) {
        const session = (await supabase?.auth.getSession())?.data.session;
        if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
        const logoKey = publisherCover ? (await storageProvider.uploadFile(publisherCover, "covers")).fileKey : savedPublisher?.logo_key || "";
        const response = await fetch("/api/series/upsert", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ publisherAction: savedPublisher ? "update" : "create", originalName: savedPublisher?.publisher || knownPublisher, name: knownPublisher, logoKey }) });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error || "Não foi possível salvar a editora.");
      }
      const parentId = existingParent?.id || await saveSeriesRecord({ title: collection.trim(), publisher: knownPublisher, startYear: Number(year), description: "", bannerTone: "collection", coverKey: collectionCover ? (await storageProvider.uploadFile(collectionCover, "covers")).fileKey : "" });
      if (existingParent && collectionCover) await saveSeriesRecord({ ...existingParent, coverKey: (await storageProvider.uploadFile(collectionCover, "covers")).fileKey });
      let targetId = parentId;
      if (kind !== "collection") {
        if (!child.trim()) throw new Error("Informe o nome da saga, fase ou obra fechada.");
        targetId = existingChild?.id || await saveSeriesRecord({ title: child.trim(), publisher: knownPublisher, startYear: Number(year), description: "", bannerTone: kind, parentSeriesId: parentId, coverKey: childCover ? (await storageProvider.uploadFile(childCover, "covers")).fileKey : "" });
        if (existingChild && childCover) await saveSeriesRecord({ ...existingChild, coverKey: (await storageProvider.uploadFile(childCover, "covers")).fileKey });
      }
      await onCreated(targetId);
      onFeedback(`Organização pronta: ${knownPublisher} → ${collection.trim()}${kind !== "collection" ? ` → ${child.trim()}` : ""}. Arquivos sem agrupamento foram associados para revisão.`, "success");
      setOpen(false);
    } catch (error) { onFeedback(error instanceof Error ? error.message : "Não foi possível organizar o acervo.", "error"); }
    finally { setBusy(false); }
  };

  return <section className="studio-panel import-organization">
    <button type="button" className="import-organization-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Plus size={18} /><span><strong>Preparar editora, coleção e saga</strong><small>Crie a organização e adicione capas sem sair do upload.</small></span></button>
    {open && <form onSubmit={(event) => void save(event)} className="form-grid mt-4">
      <p className="span-2 text-xs text-slate-400">Confira a hierarquia antes de salvar. Itens já existentes serão reutilizados; o novo agrupamento será sugerido aos arquivos ainda sem coleção.</p>
      <label>Editora<input className="admin-field" list="import-publishers" value={publisher} onChange={(event) => setPublisher(event.target.value)} placeholder="Ex.: DC Comics" required /><datalist id="import-publishers">{publishers.map((item) => <option key={item} value={item} />)}</datalist></label>
      <label>Capa ou logo da nova editora<input className="admin-field" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPublisherCover(event.target.files?.[0] || null)} /></label>
      <label>Coleção principal<input className="admin-field" value={collection} onChange={(event) => setCollection(event.target.value)} placeholder="Ex.: Superman" required /></label>
      <label>Capa da coleção<input className="admin-field" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCollectionCover(event.target.files?.[0] || null)} /></label>
      <label>Tipo de conteúdo<select className="admin-field" value={kind} onChange={(event) => setKind(event.target.value)}><option value="collection">Edições da coleção</option><option value="saga">Saga / arco narrativo</option><option value="phase">Fase / linha editorial</option><option value="one_shot">Obra fechada / volume único</option></select></label>
      <label>Ano inicial<input className="admin-field" type="number" min="1800" max="2200" value={year} onChange={(event) => setYear(event.target.value)} required /></label>
      {kind !== "collection" && <><label>Nome da {kind === "one_shot" ? "obra" : kind === "phase" ? "fase" : "saga"}<input className="admin-field" value={child} onChange={(event) => setChild(event.target.value)} required /></label><label>Capa desse agrupamento<input className="admin-field" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setChildCover(event.target.files?.[0] || null)} /></label></>}
      <button className="studio-primary span-2" disabled={busy}>{busy ? "Organizando..." : "Criar e associar à fila"}</button>
    </form>}
  </section>;
}
