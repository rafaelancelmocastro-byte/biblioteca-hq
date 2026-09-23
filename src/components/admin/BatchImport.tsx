import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Comic, Series } from "../../types/comic";
import { extractPdfCover, makeImageThumbnail, type PdfInspection } from "../../services/pdfImport";
import { inspectPublication, manualPublicationInspection } from "../../services/publicationImport";
import { publicationFormat } from "../../services/publicationFormats";
import { checkComicDuplicate, createComicRecord, saveSeriesRecord, updateComicRecord, type ComicRegistration } from "../../services/comicAdminService";
import { storageProvider } from "../../services/storageProvider";
import { runLimited } from "../../services/runLimited";
import { isPhaseTitle, suggestIssueSeries } from "../../services/seriesHierarchy";

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
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; published: number } | null>(null);
  const [batchTiming, setBatchTiming] = useState<string>("");
  const [analysisTiming, setAnalysisTiming] = useState<string>("");
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
    const timer = window.setTimeout(() => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(record));
      savedDrafts.current = record;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [drafts]);
  const proposedGroup = useMemo(() => {
    const counts = new Map<string, { title: string; count: number }>();
    for (const file of files) {
      const title = file.name.replace(/\.(pdf|cbr|cbz|epub|azw3)$/i, "").replace(/(?:\s*[#№]\s*\d+|\s+(?:edi[çc][ãa]o|issue)\s*\d+|\s+\d{1,4})(?:\s+(?:18|19|20)\d{2})?$/i, "").trim();
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
    const parent = series.filter((item) => !item.parentSeriesId && item.bannerTone !== "saga" && item.bannerTone !== "phase" && item.bannerTone !== "one_shot" && files.some((file) => normalize(file.name).includes(normalize(item.title)))).sort((a, b) => b.title.length - a.title.length)[0];
    if (parent) { setGroupKind(isPhaseTitle(proposedGroup.title) ? "phase" : proposedGroup.count === 1 ? "one_shot" : "saga"); setGroupParentId(parent.id); setGroupPublisher(parent.publisher); }
  }, [proposedGroup, files, series]);

  const createSuggestedGroup = async () => {
    if (!proposedGroup || !groupTitle.trim() || !groupPublisher.trim() || !/^\d{4}$/.test(groupYear)) { setGroupError("Confirme nome, editora e ano inicial para criar o agrupamento."); onFeedback("Confirme nome, editora e ano inicial para criar o agrupamento.", "error"); return; }
    if (["one_shot", "phase"].includes(groupKind) && !groupParentId) { setGroupError("Escolha a coleção principal desta fase ou obra fechada."); return; }
    setPublishing(true); setGroupError("");
    try {
      const id = await saveSeriesRecord({ title: groupTitle.trim(), publisher: groupPublisher.trim(), startYear: Number(groupYear), description: "", bannerTone: groupKind, parentSeriesId: groupKind !== "collection" ? groupParentId || undefined : undefined });
      setDrafts((current) => current.map((draft) => normalize(draft.file.name).startsWith(normalize(proposedGroup.title)) ? { ...draft, seriesId: id } : draft));
      await onComplete();
      onFeedback(`${groupKind === "saga" ? "Saga" : groupKind === "phase" ? "Fase" : groupKind === "one_shot" ? "Obra fechada" : "Coleção"} “${groupTitle}” criada e associada aos arquivos.`, "success");
    } catch (error) { const message = error instanceof Error ? error.message : "Não foi possível criar o agrupamento."; setGroupError(message); onFeedback(message, "error"); }
    finally { setPublishing(false); }
  };

  useEffect(() => {
    let active = true;
    setAnalysisTiming("");
    setDrafts(files.map((file) => ({ file, meta: null, seriesId: "", status: "analyzing", message: "Arquivo recebido. Preparando a ficha..." })));
    const inspect = async () => {
      const startedAt = performance.now();
      await runLimited(files, window.matchMedia("(pointer: coarse)").matches ? 1 : 2, async (file, index) => {
        try {
          const meta = await inspectPublication(file, window.matchMedia("(pointer: coarse)").matches);
          if (!active) return;
          const exact = suggestIssueSeries(file.name, meta.title, series);
          const matchedCover = covers.find((item) => normalize(item.name) === normalize(file.name));
          const saved = savedDrafts.current[draftKey(file)];
          setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, meta: saved?.meta ? { ...meta, ...saved.meta, cover: meta.cover, thumbnail: meta.thumbnail } : meta, seriesId: saved?.seriesId || exact?.id || "", coverOverride: matchedCover, status: saved?.status === "published" ? "published" : meta.totalPages ? "ready" : "incomplete", message: saved?.status === "published" ? saved.message || "Publicado." : meta.warning || (exact ? `Caminho sugerido: ${seriesPath(exact, series)}. Confirme ou corrija antes de publicar.` : "Selecione a coleção ou saga; campos sem evidência permanecem vazios.") } : draft));
        } catch (error) {
          if (!active) return;
          try {
            if (publicationFormat(file.name) !== "pdf") throw error;
            const meta = await manualPublicationInspection(file);
            if (!active) return;
            const saved = savedDrafts.current[draftKey(file)];
            setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, meta: saved?.meta || meta, seriesId: saved?.seriesId || draft.seriesId, status: saved?.status === "published" ? "published" : "incomplete", message: saved?.message || meta.warning || "Preencha os dados manualmente." } : draft));
          } catch (fallbackError) {
            if (!active) return;
            setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, status: "error", message: fallbackError instanceof Error ? fallbackError.message : "Falha ao analisar o arquivo." } : draft));
          }
        }
      });
      if (active && files.length) setAnalysisTiming(`Análise de ${files.length} arquivo(s): ${((performance.now() - startedAt) / 1000).toFixed(1)}s.`);
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
    setBatchTiming("");
    const startedAt = performance.now();
    const stageMs = { upload: 0, covers: 0, record: 0 };
    const jobs = drafts.map((draft, index) => ({ draft, index })).filter(({ draft, index }) => forceIndex !== undefined ? index === forceIndex : ["ready", "incomplete", "error"].includes(draft.status));
    setBatchProgress({ done: 0, total: jobs.length, published: 0 });
    let published = 0;
    let done = 0;
    const completed = new Set<number>();
    const seenIssues = new Set<string>();
    try {
    await runLimited(jobs, window.matchMedia("(pointer: coarse)").matches ? 2 : 3, async ({ draft, index }) => {
      try {
      const meta = draft.meta;
      const chosen = series.find((item) => item.id === draft.seriesId);
      if (!meta || !chosen || !meta.title.trim() || !/^\d+$/.test(meta.issueNumber.trim()) || !Number(meta.year) || !Number(meta.totalPages)) {
        update(index, { status: "incomplete", message: "Complete título, edição, ano, páginas e coleção antes de publicar." });
        return;
      }
      if (!chosen.parentSeriesId && isPhaseTitle(`${meta.title} ${draft.file.name}`) && series.some((item) => item.parentSeriesId === chosen.id && item.bannerTone === "phase")) {
        update(index, { status: "incomplete", message: `Esta edição parece pertencer a uma fase de “${chosen.title}”. Selecione a fase no campo Coleção / saga antes de publicar.` });
        return;
      }
      const issueKey = `${chosen.id}:${Number(meta.issueNumber)}:${Number(meta.year)}:${normalize(meta.title)}`;
      if (forceIndex === undefined && seenIssues.has(issueKey)) {
        update(index, { status: "incomplete", message: `Esta mesma edição já aparece neste lote para “${chosen.title}”. Confira título, ano e número antes de publicar.` });
        return;
      }
      seenIssues.add(issueKey);
      const duplicate = existingComics.find((comic) => comic.seriesId === chosen.id && comic.issueNumber === Number(meta.issueNumber) && comic.year === Number(meta.year) && normalize(comic.title) === normalize(meta.title));
      if (duplicate && forceIndex !== index) {
        update(index, { status: "duplicate", message: `Possível duplicidade de “${duplicate.title}”. Revise antes de decidir.`, existingId: duplicate.id });
        return;
      }
      try {
        if (forceIndex !== index && !replaceExisting && !metadataOnly) {
          const check = await checkComicDuplicate({ title: meta.title.trim(), issueNumber: Number(meta.issueNumber), year: Number(meta.year), fileSha256: meta.fileSha256, series: chosen });
          if (check.code !== "UNIQUE") { update(index, { status: "duplicate", message: check.message || "Possível duplicidade.", existingId: check.existing?.id }); return; }
        }
        update(index, { status: "uploading", message: "Preparando capa e arquivo..." });
        let coverFile = draft.coverOverride || meta.cover;
        let thumbnail = !metadataOnly && draft.coverOverride ? await makeImageThumbnail(draft.coverOverride) : meta.thumbnail;
        if (!metadataOnly && !coverFile) {
          const extracted = publicationFormat(draft.file.name) === "pdf" ? await extractPdfCover(draft.file, draft.file.name) : ["cbr", "cbz"].includes(publicationFormat(draft.file.name) || "") ? await inspectPublication(draft.file) : null;
          coverFile = extracted?.cover;
          thumbnail = extracted?.thumbnail;
          if (["cbr", "cbz"].includes(publicationFormat(draft.file.name) || "") && !coverFile) throw new Error("Não foi possível extrair a primeira imagem do arquivo. Confira a HQ antes de publicar.");
        }
        let lastPercent = -10;
        const uploadStartedAt = performance.now();
        const pdfUpload = metadataOnly ? null : await storageProvider.uploadFile(draft.file, "comics", (percent) => {
          if (percent === 100 || percent - lastPercent >= 10) { lastPercent = percent; update(index, { message: `Enviando arquivo: ${percent}%` }); }
        });
        stageMs.upload += performance.now() - uploadStartedAt;
        const coverStartedAt = performance.now();
        update(index, { message: "Finalizando capa e cadastro..." });
        const [coverUpload, thumbUpload] = await Promise.all([
          !metadataOnly && coverFile ? storageProvider.uploadFile(coverFile, "covers") : null,
          !metadataOnly && thumbnail ? storageProvider.uploadFile(thumbnail, "covers") : null,
        ]);
        stageMs.covers += performance.now() - coverStartedAt;
        const payload: ComicRegistration = {
          title: meta.title.trim(), contentType: ["epub", "azw3"].includes(publicationFormat(draft.file.name) || "") ? "book" : "comic", issueNumber: Number(meta.issueNumber), year: Number(meta.year), totalPages: Number(meta.totalPages),
          fileName: draft.file.name, fileSizeMb: pdfUpload?.fileSizeMb ?? 0, pdfKey: pdfUpload?.fileKey ?? "",
          coverKey: coverUpload?.fileKey, coverThumbKey: thumbUpload?.fileKey, fileSha256: meta.fileSha256,
          synopsis: meta.synopsis, writers: split(meta.writers), pencillers: split(meta.pencillers), colorists: split(meta.colorists), tags: split(meta.tags), characters: split(meta.characters), series: chosen,
          allowDuplicate: forceIndex === index && !replaceExisting,
        };
        const recordStartedAt = performance.now();
        if ((replaceExisting || metadataOnly) && draft.existingId) await updateComicRecord(draft.existingId, metadataOnly ? { ...payload, fileName: "", fileSizeMb: 0, fileSha256: undefined } : payload);
        else await createComicRecord(payload);
        stageMs.record += performance.now() - recordStartedAt;
        published++;
        completed.add(index);
        update(index, { status: "published", message: metadataOnly ? "Metadados atualizados; Arquivo existente preservado." : replaceExisting ? "Arquivo e ficha da edição existente atualizados." : "Publicado com ficha e arquivo individuais." });
      } catch (error) {
        const typed = error as Error & { code?: string; existing?: { id: string } };
        update(index, { status: typed.code === "SAME_FILE" || typed.code === "POSSIBLE_DUPLICATE" ? "duplicate" : "error", message: typed.message || "Falha ao publicar este arquivo.", existingId: typed.existing?.id });
      }
      } finally {
        done++;
        setBatchProgress({ done, total: jobs.length, published });
      }
    });
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
      setBatchTiming(`Lote: ${elapsed}s no total. Soma por arquivo: envio ${Math.round(stageMs.upload / 1000)}s, capas ${Math.round(stageMs.covers / 1000)}s, cadastro ${Math.round(stageMs.record / 1000)}s. As etapas ocorrem em paralelo.`);
      if (published) { await onComplete(); onFeedback(`${published} arquivo(s) publicado(s) em ${elapsed}s.`, "success"); if (forceIndex === undefined && drafts.every((draft, index) => draft.status === "published" || completed.has(index))) discard(); }
      else onFeedback("Nenhum arquivo foi publicado. Revise as fichas sinalizadas na fila.", "error");
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Não foi possível concluir a fila.", "error");
    } finally { setPublishing(false); }
  };

  return <section id="batch-review" className="batch-review" aria-label="Revisão da importação em lote">
    <div className="batch-review-header"><div><strong>Revisar arquivos</strong><span>Cada arquivo tem seus próprios dados. Confira as sugestões antes de publicar. Esta lista fica salva neste dispositivo até você publicar ou descartar.</span></div><button type="button" onClick={discard} disabled={publishing}>Descartar fila</button></div>
    <div className="batch-shared-panel"><strong>Dados comuns a todos os arquivos desta fila</strong><p>Marque somente o que se repete. O restante, como número da edição, páginas e capa, continua individual.</p><div className="batch-shared-grid">{sharedFields.map((field) => <label key={field} className={field === "synopsis" ? "wide" : ""}><span><input type="checkbox" checked={sharedEnabled.includes(field)} onChange={(event) => setSharedEnabled((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))} /> Aplicar {sharedLabels[field]} a todos</span>{field === "seriesId" ? <select value={sharedValues.seriesId} onChange={(event) => setSharedValues((current) => ({ ...current, seriesId: event.target.value }))}><option value="">Selecione a coleção</option>{series.map((item) => <option key={item.id} value={item.id}>{seriesPath(item, series)}</option>)}</select> : field === "synopsis" ? <textarea rows={2} value={sharedValues.synopsis} onChange={(event) => setSharedValues((current) => ({ ...current, synopsis: event.target.value }))} /> : <input type={field === "year" ? "number" : "text"} min={field === "year" ? 1800 : undefined} max={field === "year" ? 2200 : undefined} value={sharedValues[field]} onChange={(event) => setSharedValues((current) => ({ ...current, [field]: event.target.value }))} />}</label>)}</div><button type="button" className="studio-primary" disabled={publishing || drafts.some((draft) => draft.status === "analyzing")} onClick={applyShared}>Aplicar campos marcados à fila</button>{sharedMessage && <p role="status">{sharedMessage}</p>}</div>
    {proposedGroup && <div className="batch-group-suggestion"><strong>{proposedGroup.count} arquivo(s) sugerem o agrupamento “{proposedGroup.title}”</strong><span>Revise o tipo e a coleção principal. A sugestão vem dos nomes dos arquivos e pode ser corrigida.</span><div><label>Nome do agrupamento<input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} /></label><label>Editora<input value={groupPublisher} onChange={(event) => setGroupPublisher(event.target.value)} /></label><label>Ano inicial<input type="number" min="1800" max="2200" value={groupYear} onChange={(event) => setGroupYear(event.target.value)} /></label><label>Tipo<select value={groupKind} onChange={(event) => setGroupKind(event.target.value)}><option value="collection">Coleção</option><option value="saga">Saga</option><option value="phase">Fase / linha editorial</option><option value="one_shot">Obra fechada / volume único</option></select></label>{groupKind !== "collection" && <label>Coleção principal<select required={["one_shot", "phase"].includes(groupKind)} value={groupParentId} onChange={(event) => { setGroupParentId(event.target.value); const parent = series.find((item) => item.id === event.target.value); if (parent) setGroupPublisher(parent.publisher); }}><option value="">Sem coleção principal</option>{series.filter((item) => !item.parentSeriesId && item.bannerTone !== "saga" && item.bannerTone !== "phase" && item.bannerTone !== "one_shot").map((item) => <option key={item.id} value={item.id}>{item.publisher} → {item.title}</option>)}</select></label>}<button type="button" onClick={() => void createSuggestedGroup()} disabled={publishing}>Criar agrupamento e associar</button></div>{groupError && <p role="alert">{groupError}</p>}</div>}
    {drafts.map((draft, index) => <details key={`${draft.file.name}-${draft.file.lastModified}`} className="batch-review-item" open={index === 0}>
      <summary><strong>{draft.file.name}</strong><span className={`batch-status ${draft.status}`}>{draft.status === "analyzing" ? "Analisando" : draft.status === "ready" ? "Revisar" : draft.status === "uploading" ? "Enviando" : draft.status === "published" ? "Publicado" : draft.status === "incomplete" ? "Incompleto" : draft.status === "duplicate" ? "Possível duplicado" : draft.status === "cancelled" ? "Cancelado" : "Erro"}</span></summary>
      <p role="status">{draft.message}</p>
      {draft.meta && <div className="batch-review-fields">
        <label>Título<input value={draft.meta.title} onChange={(event) => updateMeta(index, "title", event.target.value)} /></label>
        <label>Edição<input type="number" min="0" value={draft.meta.issueNumber} onChange={(event) => updateMeta(index, "issueNumber", event.target.value)} /></label>
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
      {draft.status === "duplicate" && <div className="batch-duplicate-actions"><button type="button" onClick={() => void publish(index)} disabled={publishing}>Manter ambos</button>{draft.existingId && <><button type="button" onClick={() => void publish(index, true)} disabled={publishing}>Substituir arquivo existente</button><button type="button" onClick={() => void publish(index, false, true)} disabled={publishing}>Atualizar só metadados</button></>}<button type="button" onClick={() => update(index, { status: "cancelled", message: "Importação cancelada pelo proprietário." })}>Cancelar este arquivo</button></div>}
    </details>)}
    {batchProgress && publishing && <p className="batch-progress" role="status">{batchProgress.done} de {batchProgress.total} processados · {batchProgress.published} publicados. Até {window.matchMedia("(pointer: coarse)").matches ? 2 : 3} arquivos são enviados em paralelo.</p>}
    {analysisTiming && !publishing && <p className="batch-progress">{analysisTiming}</p>}
    {batchTiming && !publishing && <p className="batch-progress" role="status">{batchTiming}</p>}
    <button type="button" className="studio-primary" disabled={publishing || drafts.some((draft) => draft.status === "analyzing")} onClick={() => void publish()}>{publishing ? "Processando fila..." : "Publicar arquivos revisados"}</button>
  </section>;
};
