import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Comic, Series } from "../../types/comic";
import { inspectPdf, makeImageThumbnail, manualPdfInspection, type PdfInspection } from "../../services/pdfImport";
import { checkComicDuplicate, createComicRecord, saveSeriesRecord, updateComicRecord, type ComicRegistration } from "../../services/comicAdminService";
import { storageProvider } from "../../services/storageProvider";

type Draft = {
  file: File;
  meta: PdfInspection | null;
  seriesId: string;
  status: "analyzing" | "ready" | "uploading" | "published" | "incomplete" | "duplicate" | "error" | "cancelled";
  message: string;
  coverOverride?: File;
  existingId?: string;
};
type SharedField = "title" | "year" | "characters" | "writers" | "pencillers" | "colorists" | "tags" | "synopsis" | "seriesId";
const sharedLabels: Record<SharedField, string> = { title: "Título", year: "Ano", characters: "Personagem / grupo", writers: "Roteiro", pencillers: "Arte e desenho", colorists: "Cores", tags: "Tags", synopsis: "Sinopse", seriesId: "Coleção / saga" };
const sharedFields: SharedField[] = ["title", "year", "characters", "writers", "pencillers", "colorists", "tags", "synopsis", "seriesId"];

const CoverPreview: React.FC<{ file: File; alt: string }> = ({ file, alt }) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ? <img className="batch-cover-preview" src={url} alt={alt} /> : null;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const seriesPath = (item: Series, series: Series[]) => `${item.publisher} → ${item.parentSeriesId ? `${series.find((parent) => parent.id === item.parentSeriesId)?.title || "Coleção"} → ` : ""}${item.title}`;
const suggestSeries = (fileName: string, series: Series[]) => series
  .filter((item) => normalize(item.title).length > 3 && normalize(fileName).includes(normalize(item.title)))
  .sort((a, b) => normalize(b.title).length - normalize(a.title).length)[0];
const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const draftKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
const DRAFT_STORAGE_KEY = "biblioteca-hq-batch-review-v1";
function readSavedDrafts(): Record<string, Partial<Draft>> {
  try { return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "{}"); } catch { return {}; }
}

interface Props {
  files: File[];
  covers: File[];
  series: Series[];
  existingComics: Comic[];
  onComplete: () => Promise<unknown>;
  onClear: () => void;
  onFeedback: (message: string, type: "success" | "error" | "info") => void;
}

export const BatchImport: React.FC<Props> = ({ files, covers, series, existingComics, onComplete, onClear, onFeedback }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const savedDrafts = useRef<Record<string, Partial<Draft>>>(readSavedDrafts());
  const [publishing, setPublishing] = useState(false);
  const [groupPublisher, setGroupPublisher] = useState("");
  const [groupYear, setGroupYear] = useState("");
  const [groupKind, setGroupKind] = useState("collection");
  const [groupParentId, setGroupParentId] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupError, setGroupError] = useState("");
  const [sharedValues, setSharedValues] = useState<Record<SharedField, string>>({ title: "", year: "", characters: "", writers: "", pencillers: "", colorists: "", tags: "", synopsis: "", seriesId: "" });
  const [sharedEnabled, setSharedEnabled] = useState<SharedField[]>([]);
  const [sharedMessage, setSharedMessage] = useState("");
  const discard = () => { localStorage.removeItem(DRAFT_STORAGE_KEY); savedDrafts.current = {}; onClear(); };
  useEffect(() => {
    if (!drafts.length || drafts.some((draft) => draft.status === "analyzing")) return;
    const record = Object.fromEntries(drafts.map((draft) => [draftKey(draft.file), {
      meta: draft.meta ? { ...draft.meta, cover: undefined, thumbnail: undefined } : null,
      seriesId: draft.seriesId, status: draft.status, message: draft.message, existingId: draft.existingId,
    }]));
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(record));
    savedDrafts.current = record;
  }, [drafts]);
  const proposedGroup = useMemo(() => {
    const counts = new Map<string, { title: string; count: number }>();
    for (const file of files) {
      const title = file.name.replace(/\.pdf$/i, "").replace(/(?:\s*[#№]\s*\d+|\s+(?:edi[çc][ãa]o|issue)\s*\d+|\s+\d{1,4})(?:\s+(?:18|19|20)\d{2})?$/i, "").trim();
      const key = normalize(title);
      if (key.length < 6 || ["superman", "batman", "vingadores", "xmen", "homemaranha", "ligadajustica"].includes(key)) continue;
      const entry = counts.get(key);
      counts.set(key, { title, count: (entry?.count || 0) + 1 });
    }
    return [...counts.values()].find((entry) => !series.some((item) => normalize(item.title) === normalize(entry.title)) && (entry.count >= 2 || series.some((item) => item.bannerTone !== "saga" && item.bannerTone !== "one_shot" && normalize(entry.title).includes(normalize(item.title)))));
  }, [files, series]);

  useEffect(() => {
    if (!proposedGroup) return;
    setGroupTitle(proposedGroup.title);
    const year = files.map((file) => file.name.match(/(?:19|20)\d{2}/)?.[0]).find(Boolean);
    if (year) setGroupYear(year);
    const parent = series.filter((item) => item.bannerTone !== "saga" && item.bannerTone !== "one_shot" && files.some((file) => normalize(file.name).includes(normalize(item.title)))).sort((a, b) => b.title.length - a.title.length)[0];
    if (parent) { setGroupKind(proposedGroup.count === 1 ? "one_shot" : "saga"); setGroupParentId(parent.id); setGroupPublisher(parent.publisher); }
  }, [proposedGroup, files, series]);

  const createSuggestedGroup = async () => {
    if (!proposedGroup || !groupTitle.trim() || !groupPublisher.trim() || !/^\d{4}$/.test(groupYear)) { setGroupError("Confirme nome, editora e ano inicial para criar o agrupamento."); onFeedback("Confirme nome, editora e ano inicial para criar o agrupamento.", "error"); return; }
    if (groupKind === "one_shot" && !groupParentId) { setGroupError("Escolha a coleção principal da obra fechada."); return; }
    setPublishing(true); setGroupError("");
    try {
      const id = await saveSeriesRecord({ title: groupTitle.trim(), publisher: groupPublisher.trim(), startYear: Number(groupYear), description: "", bannerTone: groupKind, parentSeriesId: groupKind !== "collection" ? groupParentId || undefined : undefined });
      setDrafts((current) => current.map((draft) => normalize(draft.file.name).startsWith(normalize(proposedGroup.title)) ? { ...draft, seriesId: id } : draft));
      await onComplete();
      onFeedback(`${groupKind === "saga" ? "Saga" : groupKind === "one_shot" ? "Obra fechada" : "Coleção"} “${groupTitle}” criada e associada aos arquivos.`, "success");
    } catch (error) { const message = error instanceof Error ? error.message : "Não foi possível criar o agrupamento."; setGroupError(message); onFeedback(message, "error"); }
    finally { setPublishing(false); }
  };

  useEffect(() => {
    let active = true;
    setDrafts(files.map((file) => ({ file, meta: null, seriesId: "", status: "analyzing", message: "Arquivo recebido. Preparando a ficha..." })));
    const inspect = async () => {
      for (const [index, file] of files.entries()) {
        try {
          const meta = window.matchMedia("(pointer: coarse)").matches ? await manualPdfInspection(file) : await inspectPdf(file);
          if (!active) return;
          const exact = suggestSeries(file.name, series);
          const matchedCover = covers.find((item) => normalize(item.name) === normalize(file.name));
          const saved = savedDrafts.current[draftKey(file)];
          setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, meta: saved?.meta || meta, seriesId: saved?.seriesId || exact?.id || "", coverOverride: matchedCover, status: saved?.status === "published" ? "published" : meta.totalPages ? "ready" : "incomplete", message: saved?.message || meta.warning || (exact ? `Caminho sugerido: ${seriesPath(exact, series)}. Confirme ou corrija antes de publicar.` : "Selecione a coleção ou saga; campos sem evidência permanecem vazios.") } : draft));
        } catch (error) {
          if (!active) return;
          try {
            if (error instanceof Error && error.message === "PDF protegido por senha.") throw error;
            const meta = await manualPdfInspection(file);
            if (!active) return;
            const saved = savedDrafts.current[draftKey(file)];
            setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, meta: saved?.meta || meta, seriesId: saved?.seriesId || draft.seriesId, status: saved?.status === "published" ? "published" : "incomplete", message: saved?.message || meta.warning || "Preencha os dados manualmente." } : draft));
          } catch (fallbackError) {
            if (!active) return;
            setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, status: "error", message: fallbackError instanceof Error ? fallbackError.message : "Falha ao analisar o PDF." } : draft));
          }
        }
      }
    };
    void inspect();
    return () => { active = false; };
  }, [files]);

  const update = (index: number, patch: Partial<Draft>) => setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, ...patch } : draft));
  const updateMeta = (index: number, key: keyof PdfInspection, value: string) => setDrafts((current) => current.map((draft, position) => position === index && draft.meta ? { ...draft, meta: { ...draft.meta, [key]: value }, status: "ready" } : draft));
  const applyShared = () => {
    if (!sharedEnabled.length) { setSharedMessage("Marque os campos que deseja repetir."); onFeedback("Marque os campos que deseja repetir.", "error"); return; }
    const selected = sharedEnabled.filter((field) => sharedValues[field].trim());
    if (!selected.length) { setSharedMessage("Preencha ao menos um campo marcado."); onFeedback("Preencha ao menos um campo marcado.", "error"); return; }
    const changed = drafts.filter((draft) => draft.meta && !["published", "uploading", "cancelled"].includes(draft.status)).length;
    setDrafts((current) => current.map((draft) => {
      if (!draft.meta || ["published", "uploading", "cancelled"].includes(draft.status)) return draft;
      const meta = { ...draft.meta };
      let seriesId = draft.seriesId;
      for (const field of selected) {
        if (field === "seriesId") seriesId = sharedValues.seriesId;
        else meta[field] = sharedValues[field];
      }
      return { ...draft, meta, seriesId, status: "ready", message: "Campos comuns aplicados. Confira a ficha individual antes de publicar." };
    }));
    setSharedMessage(`Campos comuns aplicados às ${changed} fichas disponíveis. Cada arquivo ainda pode ser editado abaixo.`);
    onFeedback(`Campos comuns aplicados às ${changed} fichas. Confira os dados individuais antes de publicar.`, "success");
  };

  const publish = async (forceIndex?: number, replaceExisting = false, metadataOnly = false) => {
    setPublishing(true);
    let published = 0;
    for (const [index, draft] of drafts.entries()) {
      if (forceIndex !== undefined && index !== forceIndex) continue;
      if (forceIndex === undefined && !["ready", "incomplete", "error"].includes(draft.status)) continue;
      const meta = draft.meta;
      const chosen = series.find((item) => item.id === draft.seriesId);
      if (!meta || !chosen || !meta.title.trim() || !Number(meta.issueNumber) || !Number(meta.year) || !Number(meta.totalPages)) {
        update(index, { status: "incomplete", message: "Complete título, edição, ano, páginas e coleção antes de publicar." });
        continue;
      }
      const duplicate = existingComics.find((comic) => comic.seriesId === chosen.id && comic.issueNumber === Number(meta.issueNumber) && comic.year === Number(meta.year) && normalize(comic.title) === normalize(meta.title));
      if (duplicate && forceIndex !== index) {
        update(index, { status: "duplicate", message: `Possível duplicidade de “${duplicate.title}”. Revise antes de decidir.`, existingId: duplicate.id });
        continue;
      }
      try {
        if (forceIndex !== index && !replaceExisting && !metadataOnly) {
          const check = await checkComicDuplicate({ title: meta.title.trim(), issueNumber: Number(meta.issueNumber), year: Number(meta.year), fileSha256: meta.fileSha256, series: chosen });
          if (check.code !== "UNIQUE") { update(index, { status: "duplicate", message: check.message || "Possível duplicidade.", existingId: check.existing?.id }); continue; }
        }
        update(index, { status: "uploading", message: "Enviando PDF e capa ao R2..." });
        const pdfUpload = metadataOnly ? null : await storageProvider.uploadFile(draft.file, "comics", (percent) => update(index, { message: `Enviando PDF ao R2: ${percent}%` }));
        const coverFile = draft.coverOverride || meta.cover;
        const coverUpload = !metadataOnly && coverFile ? await storageProvider.uploadFile(coverFile, "covers") : null;
        const thumbnail = draft.coverOverride ? await makeImageThumbnail(draft.coverOverride) : meta.thumbnail;
        const thumbUpload = !metadataOnly && thumbnail ? await storageProvider.uploadFile(thumbnail, "covers") : null;
        const payload: ComicRegistration = {
          title: meta.title.trim(), issueNumber: Number(meta.issueNumber), year: Number(meta.year), totalPages: Number(meta.totalPages),
          fileName: draft.file.name, fileSizeMb: pdfUpload?.fileSizeMb ?? 0, pdfKey: pdfUpload?.fileKey ?? "",
          coverKey: coverUpload?.fileKey, coverThumbKey: thumbUpload?.fileKey, fileSha256: meta.fileSha256,
          synopsis: meta.synopsis, writers: split(meta.writers), pencillers: split(meta.pencillers), colorists: split(meta.colorists), tags: split(meta.tags), characters: split(meta.characters), series: chosen,
          allowDuplicate: forceIndex === index && !replaceExisting,
        };
        if ((replaceExisting || metadataOnly) && draft.existingId) await updateComicRecord(draft.existingId, metadataOnly ? { ...payload, fileName: "", fileSizeMb: 0, fileSha256: undefined } : payload);
        else await createComicRecord(payload);
        published++;
        update(index, { status: "published", message: metadataOnly ? "Metadados atualizados; PDF existente preservado." : replaceExisting ? "Arquivo e ficha da edição existente atualizados." : "Publicado com ficha e arquivo individuais." });
      } catch (error) {
        const typed = error as Error & { code?: string; existing?: { id: string } };
        update(index, { status: typed.code === "SAME_FILE" || typed.code === "POSSIBLE_DUPLICATE" ? "duplicate" : "error", message: typed.message, existingId: typed.existing?.id });
      }
    }
    if (published) { await onComplete(); onFeedback(`${published} arquivo(s) publicado(s) com sucesso.`, "success"); if (forceIndex === undefined && published === drafts.length) discard(); }
    else onFeedback("Nenhum arquivo foi publicado. Revise as fichas sinalizadas na fila.", "error");
    setPublishing(false);
  };

  return <section id="batch-review" className="batch-review" aria-label="Revisão da importação em lote">
    <div className="batch-review-header"><div><strong>Revisar lote</strong><span>Cada PDF mantém sua própria ficha. Campos sem evidência ficam vazios. A fila fica salva neste dispositivo até você publicar ou descartar.</span></div><button type="button" onClick={discard} disabled={publishing}>Descartar fila</button></div>
    <div className="batch-shared-panel"><strong>Dados comuns a todos os PDFs desta fila</strong><p>Marque somente o que se repete. O restante, como número da edição, páginas e capa, continua individual.</p><div className="batch-shared-grid">{sharedFields.map((field) => <label key={field} className={field === "synopsis" ? "wide" : ""}><span><input type="checkbox" checked={sharedEnabled.includes(field)} onChange={(event) => setSharedEnabled((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))} /> Aplicar {sharedLabels[field]} a todos</span>{field === "seriesId" ? <select value={sharedValues.seriesId} onChange={(event) => setSharedValues((current) => ({ ...current, seriesId: event.target.value }))}><option value="">Selecione a coleção</option>{series.map((item) => <option key={item.id} value={item.id}>{seriesPath(item, series)}</option>)}</select> : field === "synopsis" ? <textarea rows={2} value={sharedValues.synopsis} onChange={(event) => setSharedValues((current) => ({ ...current, synopsis: event.target.value }))} /> : <input type={field === "year" ? "number" : "text"} min={field === "year" ? 1800 : undefined} max={field === "year" ? 2200 : undefined} value={sharedValues[field]} onChange={(event) => setSharedValues((current) => ({ ...current, [field]: event.target.value }))} />}</label>)}</div><button type="button" className="studio-primary" disabled={publishing || drafts.some((draft) => draft.status === "analyzing")} onClick={applyShared}>Aplicar campos marcados à fila</button>{sharedMessage && <p role="status">{sharedMessage}</p>}</div>
    {proposedGroup && <div className="batch-group-suggestion"><strong>{proposedGroup.count} arquivo(s) sugerem o agrupamento “{proposedGroup.title}”</strong><span>Revise o tipo e a coleção principal. A sugestão vem dos nomes dos PDFs e pode ser corrigida.</span><div><label>Nome do agrupamento<input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} /></label><label>Editora<input value={groupPublisher} onChange={(event) => setGroupPublisher(event.target.value)} /></label><label>Ano inicial<input type="number" min="1800" max="2200" value={groupYear} onChange={(event) => setGroupYear(event.target.value)} /></label><label>Tipo<select value={groupKind} onChange={(event) => setGroupKind(event.target.value)}><option value="collection">Coleção</option><option value="saga">Saga</option><option value="one_shot">Obra fechada / volume único</option></select></label>{groupKind !== "collection" && <label>Coleção principal<select required={groupKind === "one_shot"} value={groupParentId} onChange={(event) => { setGroupParentId(event.target.value); const parent = series.find((item) => item.id === event.target.value); if (parent) setGroupPublisher(parent.publisher); }}><option value="">Sem coleção principal</option>{series.filter((item) => item.bannerTone !== "saga" && item.bannerTone !== "one_shot").map((item) => <option key={item.id} value={item.id}>{item.publisher} → {item.title}</option>)}</select></label>}<button type="button" onClick={() => void createSuggestedGroup()} disabled={publishing}>Criar agrupamento e associar</button></div>{groupError && <p role="alert">{groupError}</p>}</div>}
    {drafts.map((draft, index) => <details key={`${draft.file.name}-${draft.file.lastModified}`} className="batch-review-item" open={index === 0}>
      <summary><strong>{draft.file.name}</strong><span className={`batch-status ${draft.status}`}>{draft.status === "analyzing" ? "Analisando" : draft.status === "ready" ? "Revisar" : draft.status === "uploading" ? "Enviando" : draft.status === "published" ? "Publicado" : draft.status === "incomplete" ? "Incompleto" : draft.status === "duplicate" ? "Possível duplicado" : draft.status === "cancelled" ? "Cancelado" : "Erro"}</span></summary>
      <p role="status">{draft.message}</p>
      {draft.meta && <div className="batch-review-fields">
        <label>Título<input value={draft.meta.title} onChange={(event) => updateMeta(index, "title", event.target.value)} /></label>
        <label>Edição<input type="number" min="1" value={draft.meta.issueNumber} onChange={(event) => updateMeta(index, "issueNumber", event.target.value)} /></label>
        <label>Ano<input type="number" min="1800" max="2200" value={draft.meta.year} onChange={(event) => updateMeta(index, "year", event.target.value)} /></label>
        <label>Páginas<input type="number" min="1" value={draft.meta.totalPages} onChange={(event) => updateMeta(index, "totalPages", event.target.value)} /></label>
        <label>Coleção / saga<select value={draft.seriesId} onChange={(event) => update(index, { seriesId: event.target.value })}><option value="">Selecione uma coleção confirmada</option>{series.map((item) => <option key={item.id} value={item.id}>{seriesPath(item, series)}</option>)}</select></label>
        <label>Personagem / grupo<input value={draft.meta.characters} onChange={(event) => updateMeta(index, "characters", event.target.value)} /></label>
        <label>Roteiro<input value={draft.meta.writers} onChange={(event) => updateMeta(index, "writers", event.target.value)} /></label>
        <label>Arte e desenho<input value={draft.meta.pencillers} onChange={(event) => updateMeta(index, "pencillers", event.target.value)} /></label>
        <label>Cores<input value={draft.meta.colorists} onChange={(event) => updateMeta(index, "colorists", event.target.value)} /></label>
        <label>Tags<input value={draft.meta.tags} onChange={(event) => updateMeta(index, "tags", event.target.value)} /></label>
        <label className="span-2">Sinopse<textarea rows={2} value={draft.meta.synopsis} onChange={(event) => updateMeta(index, "synopsis", event.target.value)} /></label>
        <label className="span-2">Substituir capa automática<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => update(index, { coverOverride: event.target.files?.[0] })} /></label>
        {draft.meta.cover && !draft.coverOverride && <CoverPreview file={draft.meta.cover} alt={`Capa extraída de ${draft.file.name}`} />}
      </div>}
      {draft.status === "duplicate" && <div className="batch-duplicate-actions"><button type="button" onClick={() => void publish(index)} disabled={publishing}>Manter ambos</button>{draft.existingId && <><button type="button" onClick={() => void publish(index, true)} disabled={publishing}>Substituir PDF existente</button><button type="button" onClick={() => void publish(index, false, true)} disabled={publishing}>Atualizar só metadados</button></>}<button type="button" onClick={() => update(index, { status: "cancelled", message: "Importação cancelada pelo proprietário." })}>Cancelar este arquivo</button></div>}
    </details>)}
    <button type="button" className="studio-primary" disabled={publishing || drafts.some((draft) => draft.status === "analyzing")} onClick={() => void publish()}>{publishing ? "Processando fila..." : "Publicar arquivos revisados"}</button>
  </section>;
};
