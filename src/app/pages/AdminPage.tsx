import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BookCopy, CheckCircle2, Cloud, Database, Edit3, FileImage, FileUp, LibraryBig, Plus, Save, Shield, UploadCloud, X } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { storageProvider } from "../../services/storageProvider";
import { checkComicDuplicate, checkStorageStatuses, comicToRegistration, createComicRecord, deleteComicRecords, deleteSeriesRecord, regenerateComicCover, saveSeriesRecord, updateCollectionComics, updateComicRecord, updateSelectedComics, type SelectedComicPatch } from "../../services/comicAdminService";
import type { Comic, Series } from "../../types/comic";
import { formatFileSize } from "../../lib/formatters";
import { BatchImport } from "../../components/admin/BatchImport";
import { extractPdfCover, makeImageThumbnail } from "../../services/pdfImport";
import { inspectPublication, manualPublicationInspection } from "../../services/publicationImport";
import { PUBLICATION_ACCEPT, publicationFormat } from "../../services/publicationFormats";
import { UsersPanel } from "../../components/admin/UsersPanel";
import { AssetsPanel } from "../../components/admin/AssetsPanel";
import { clearSharedPdfs, takeSharedPdfs } from "../../services/sharedPdfImport";
import { loadPendingImport, savePendingImport } from "../../services/pendingImport";
import { supabase } from "../../services/supabaseClient";
import { isPhaseTitle, suggestIssueSeries, suggestParentSeries } from "../../services/seriesHierarchy";
import { runLimited } from "../../services/runLimited";
import { getComicReadUrl } from "../../services/comicRead";

type Tab = "catalog" | "collections" | "users" | "status";
const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const mergeFiles = (files: File[]) => [...new Map(files.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file])).values()];
const seriesPath = (series: Series, all: Series[]) => `${series.publisher} → ${series.parentSeriesId ? `${all.find((item) => item.id === series.parentSeriesId)?.title || "Coleção"} → ` : ""}${series.title}`;
const fieldClass = "admin-field";
type BulkField = "title" | "year" | "synopsis" | "characters" | "writers" | "pencillers" | "colorists" | "tags" | "seriesId" | "contentType" | "readingDirection";
const bulkLabels: Record<BulkField, string> = { title: "Título", year: "Ano", synopsis: "Sinopse", characters: "Personagens / grupos", writers: "Roteiro", pencillers: "Arte e desenho", colorists: "Cores", tags: "Categorias / tags", seriesId: "Coleção / saga", contentType: "Formato", readingDirection: "Sentido da leitura" };
const bulkFields = Object.keys(bulkLabels) as BulkField[];

export const AdminPage: React.FC = () => {
  const { allComics, seriesList, reloadData } = useLibrary();
  const [tab, setTab] = useState<Tab>("catalog");
  const [editing, setEditing] = useState<Comic | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const mobilePdfPicker = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const waitingForPdfPicker = useRef(false);
  const sharedImportLoaded = useRef(false);
  const lastPdfSelection = useRef({ signature: "", at: 0 });
  const [cover, setCover] = useState<File | null>(null);
  const [coverThumbnail, setCoverThumbnail] = useState<File | null>(null);
  const [pdfHash, setPdfHash] = useState<string | undefined>();
  const [batchPdfs, setBatchPdfs] = useState<File[]>([]);
  const [batchCovers, setBatchCovers] = useState<File[]>([]);
  const [draftUserId, setDraftUserId] = useState("");
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<"saving" | "saved" | "error" | "idle">("idle");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEnabled, setBulkEnabled] = useState<BulkField[]>([]);
  const [bulkValues, setBulkValues] = useState<Record<BulkField, string>>({ title: "", year: "", synopsis: "", characters: "", writers: "", pencillers: "", colorists: "", tags: "", seriesId: "", contentType: "comic", readingDirection: "ltr" });
  const [applyToCollection, setApplyToCollection] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "comics"; ids: string[] } | { type: "series"; id: string } | null>(null);
  const [form, setForm] = useState({ title: "", seriesId: "", issue: "", year: "", pages: "", synopsis: "", writers: "", pencillers: "", colorists: "", tags: "", characters: "", volume: "", contentType: "comic", readingDirection: "ltr" });
  useEffect(() => {
    let active = true;
    void (async () => {
      const userId = (await supabase?.auth.getSession())?.data.session?.user.id;
      if (!active) return;
      if (!userId) { setDraftHydrated(true); return; }
      try {
        const saved = await loadPendingImport<typeof form>(userId);
        if (!active) return;
        if (saved) {
          setPdf(saved.pdf); setBatchPdfs(saved.batchPdfs); setCover(saved.cover); setBatchCovers(saved.batchCovers);
          const recentForm = localStorage.getItem(`biblioteca-hq-import-form:${userId}`);
          setForm(recentForm ? JSON.parse(recentForm) : saved.form);
          setNotice(`${saved.batchPdfs.length + (saved.pdf ? 1 : 0)} arquivo(s) pendente(s) recuperado(s) neste dispositivo.`);
        }
      } catch { setNotice("Não foi possível recuperar o rascunho local neste dispositivo."); }
      setDraftUserId(userId);
      setDraftHydrated(true);
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!draftHydrated || !draftUserId) return;
    const draft = pdf || batchPdfs.length || cover || batchCovers.length ? { pdf, batchPdfs, cover, batchCovers, form, savedAt: Date.now() } : null;
    let active = true;
    setDraftSaveState(draft ? "saving" : "idle");
    void savePendingImport(draftUserId, draft).then(() => { if (active && draft) setDraftSaveState("saved"); }).catch(() => { if (active) { setDraftSaveState("error"); feedback("O dispositivo não conseguiu guardar a fila localmente. Mantenha esta tela aberta até publicar.", "error"); } });
    if (!draft) localStorage.removeItem(`biblioteca-hq-import-form:${draftUserId}`);
    return () => { active = false; };
  }, [draftHydrated, draftUserId, pdf, batchPdfs, cover, batchCovers]);
  useEffect(() => { if (draftUserId && (pdf || batchPdfs.length)) localStorage.setItem(`biblioteca-hq-import-form:${draftUserId}`, JSON.stringify(form)); }, [draftUserId, form, pdf, batchPdfs.length]);
  const [seriesForm, setSeriesForm] = useState({ id: "", kind: "collection", parentSeriesId: "", title: "", publisher: "", startYear: "", endYear: "", expected: "", description: "", coverKey: "" });
  const [publisherNames, setPublisherNames] = useState<string[]>([]);
  const refreshPublisherNames = async () => { if (!supabase) return; const { data } = await supabase.from("publisher_assets").select("publisher"); setPublisherNames((data || []).map((item) => item.publisher)); };
  useEffect(() => { if (tab === "collections") void refreshPublisherNames(); }, [tab]);
  const [seriesCover, setSeriesCover] = useState<File | null>(null);
  const [seriesCoverPreview, setSeriesCoverPreview] = useState("");
  useEffect(() => {
    if (!seriesCover) { setSeriesCoverPreview(""); return; }
    const url = URL.createObjectURL(seriesCover);
    setSeriesCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [seriesCover]);
  const [managerSearch, setManagerSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [managerFormat, setManagerFormat] = useState("all");
  const [managerPublisher, setManagerPublisher] = useState("all");
  const [managerSeries, setManagerSeries] = useState("all");
  const [managerStorage, setManagerStorage] = useState("all");
  const [managerYear, setManagerYear] = useState("all");
  const [managerSort, setManagerSort] = useState("recent");
  const [managerPage, setManagerPage] = useState(1);
  const [storageStatuses, setStorageStatuses] = useState<Record<string, "present" | "pending" | "error">>({});
  const [coverRepair, setCoverRepair] = useState<{ done: number; total: number; fixed: number } | null>(null);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), toast.type === "error" ? 9000 : 6000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { if (batchPdfs.length) window.setTimeout(() => document.getElementById("batch-review")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100); }, [batchPdfs]);
  const feedback = (message: string, type: "success" | "error" | "info" = "success") => { setNotice(message); setToast({ message, type }); };

  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(managerSearch.trim().toLocaleLowerCase("pt-BR")), 300); return () => window.clearTimeout(timer); }, [managerSearch]);
  useEffect(() => { if (!allComics.length) return; let active = true; checkStorageStatuses(allComics.map((comic) => comic.id)).then((statuses) => { if (active) setStorageStatuses(statuses); }).catch(() => {}); return () => { active = false; }; }, [allComics]);
  const managedComics = useMemo(() => allComics.filter((comic) => {
    const haystack = [comic.title, comic.seriesTitle, comic.fileName, ...comic.writers, ...comic.pencillers, ...comic.characters].join(" ").toLocaleLowerCase("pt-BR");
    return (!debouncedSearch || haystack.includes(debouncedSearch)) && (managerFormat === "all" || (comic.contentType || "comic") === managerFormat) && (managerPublisher === "all" || comic.publisher === managerPublisher) && (managerSeries === "all" || comic.seriesId === managerSeries) && (managerYear === "all" || comic.year === Number(managerYear)) && (managerStorage === "all" || storageStatuses[comic.id] === managerStorage);
  }).sort((a, b) => managerSort === "az" ? a.title.localeCompare(b.title, "pt-BR") : managerSort === "za" ? b.title.localeCompare(a.title, "pt-BR") : managerSort === "size" ? b.fileSizeMb - a.fileSizeMb : b.addedAt.localeCompare(a.addedAt)), [allComics, debouncedSearch, managerFormat, managerPublisher, managerSeries, managerYear, managerStorage, managerSort, storageStatuses]);
  const pageCount = Math.max(1, Math.ceil(managedComics.length / 20));
  const visibleComics = managedComics.slice((Math.min(managerPage, pageCount) - 1) * 20, Math.min(managerPage, pageCount) * 20);
  const allFilteredSelected = managedComics.length > 0 && managedComics.every((comic) => selectedIds.includes(comic.id));
  const selectFilteredComics = (checked: boolean) => {
    const filteredIds = new Set(managedComics.map((comic) => comic.id));
    setSelectedIds((current) => checked ? [...new Set([...current, ...filteredIds])] : current.filter((id) => !filteredIds.has(id)));
  };
  const missingPdfCovers = managedComics.filter((comic) => !comic.coverUrl && ["pdf", "cbr", "cbz"].includes(publicationFormat(comic.fileName) || "") && (!selectedIds.length || selectedIds.includes(comic.id)));
  const repairMissingCovers = async () => {
    const targets = missingPdfCovers;
    if (!targets.length) return;
    setCoverRepair({ done: 0, total: targets.length, fixed: 0 });
    let done = 0, fixed = 0;
    const failed: string[] = [];
    try {
      await runLimited(targets, window.matchMedia("(pointer: coarse)").matches ? 1 : 2, async (comic) => {
        try {
          if (["cbr", "cbz"].includes(publicationFormat(comic.fileName) || "")) {
            const response = await fetch(await getComicReadUrl(comic.id));
            if (!response.ok) throw new Error("Não foi possível baixar a HQ.");
            const extracted = await inspectPublication(new File([await response.blob()], comic.fileName));
            if (!extracted.cover) throw new Error("A primeira imagem do arquivo não pôde ser extraída.");
            const [coverUpload, thumbUpload] = await Promise.all([storageProvider.uploadFile(extracted.cover, "covers"), extracted.thumbnail ? storageProvider.uploadFile(extracted.thumbnail, "covers") : Promise.resolve(null)]);
            const series = seriesList.find((item) => item.id === comic.seriesId);
            if (!series) throw new Error("Coleção da edição não encontrada.");
            await updateComicRecord(comic.id, { ...comicToRegistration(comic, series), coverKey: coverUpload.fileKey, coverThumbKey: thumbUpload?.fileKey });
          } else await regenerateComicCover(comic.id);
          fixed++;
        } catch (error) { failed.push(`${comic.fileName || comic.title}: ${error instanceof Error ? error.message : "erro desconhecido"}`); }
        finally { done++; setCoverRepair({ done, total: targets.length, fixed }); }
      });
      await reloadData(true);
      feedback(failed.length ? `${fixed} capa(s) recuperada(s); ${failed.length} falharam: ${failed.slice(0, 3).join(", ")}. Tente novamente para as restantes.` : `${fixed} capa(s) recuperada(s) da primeira página dos PDFs, CBRs e CBZs.`, failed.length ? "error" : "success");
    } finally { setCoverRepair(null); }
  };
  useEffect(() => setManagerPage(1), [debouncedSearch, managerFormat, managerPublisher, managerSeries, managerYear, managerStorage, managerSort]);

  const totalMb = useMemo(() => allComics.reduce((sum, item) => sum + item.fileSizeMb, 0), [allComics]);
  const totalPages = useMemo(() => allComics.reduce((sum, item) => sum + item.totalPages, 0), [allComics]);
  const resetComicForm = () => {
    setEditing(null); setPdf(null); setCover(null); setCoverThumbnail(null); setPdfHash(undefined); setNotice(""); setApplyToCollection(false);
    setForm({ title: "", seriesId: "", issue: "", year: "", pages: "", synopsis: "", writers: "", pencillers: "", colorists: "", tags: "", characters: "", volume: "", contentType: "comic", readingDirection: "ltr" });
  };
  const startEditing = (comic: Comic) => {
    setEditing(comic); setPdf(null); setCover(null); setCoverThumbnail(null); setPdfHash(undefined); setNotice(""); setApplyToCollection(false);
    setForm({ title: comic.title, seriesId: comic.seriesId, issue: String(comic.issueNumber), year: String(comic.year), pages: String(comic.totalPages), synopsis: comic.synopsis, writers: comic.writers.join(", "), pencillers: comic.pencillers.join(", "), colorists: (comic.colorists || []).join(", "), tags: comic.tags.join(", "), characters: comic.characters.join(", "), volume: comic.volume ? String(comic.volume) : "", contentType: comic.contentType || "comic", readingDirection: comic.readingDirection || "ltr" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const selectPdfs = async (files: File[]) => {
    if (!files.length) return;
    void navigator.storage?.persist?.().catch(() => {});
    if (mobilePdfPicker && !editing) {
      const next = mergeFiles([...batchPdfs, ...(pdf ? [pdf] : []), ...files]);
      setBatchPdfs(next); setPdf(null);
      feedback(`${next.length} arquivo(s) na fila. Revise os dados antes de publicar.`, "info");
      return;
    }
    if (files.length > 1) { setBatchPdfs(files); setPdf(null); feedback(`${files.length} arquivos recebidos. Revise a fila abaixo antes de publicar.`, "info"); return; }
    setBatchPdfs([]);
    setPdf(files[0] || null);
    setPdfHash(undefined); setCoverThumbnail(null);
    feedback(`Arquivo selecionado: ${files[0].name}.`, "info");
    if (!files[0] || editing) return;
    setNotice("Analisando o arquivo e seus metadados...");
    try {
      const meta = await inspectPublication(files[0]);
      const matchedSeries = suggestIssueSeries(files[0].name, meta.title, seriesList);
      setPdfHash(meta.fileSha256);
      setCoverThumbnail(meta.thumbnail || null);
      setForm((current) => ({ ...current, title: meta.title, seriesId: matchedSeries?.id || "", issue: meta.issueNumber || (["epub", "azw3"].includes(publicationFormat(files[0].name) || "") ? "1" : ""), year: meta.year, pages: meta.totalPages, synopsis: meta.synopsis, writers: meta.writers, tags: meta.tags, characters: meta.characters, contentType: ["epub", "azw3"].includes(publicationFormat(files[0].name) || "") ? "book" : current.contentType }));
      if (meta.cover && !cover) setCover(meta.cover);
      setNotice(meta.warning || "Ficha extraída. Revise os campos vazios antes de publicar.");
    } catch (error) {
      if (publicationFormat(files[0].name) !== "pdf") { feedback(error instanceof Error ? error.message : "Arquivo incompatível.", "error"); return; }
      try {
        const fallback = await manualPublicationInspection(files[0]);
        setForm((current) => ({ ...current, title: fallback.title, issue: fallback.issueNumber, year: fallback.year, pages: "" }));
        feedback(fallback.warning || "Preencha os metadados manualmente.", "info");
      } catch (fallbackError) { feedback(fallbackError instanceof Error ? fallbackError.message : "Não foi possível ler o arquivo.", "error"); }
    }
  };
  const processPdfInput = (input: HTMLInputElement) => {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    waitingForPdfPicker.current = false;
    sessionStorage.removeItem("biblioteca-pdf-picker-open");
    const signature = files.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|");
    const now = Date.now();
    if (lastPdfSelection.current.signature === signature && now - lastPdfSelection.current.at < 1000) return;
    lastPdfSelection.current = { signature, at: now };
    void selectPdfs(files);
    window.setTimeout(() => { input.value = ""; }, 0);
  };
  const handlePdfSelection = (event: React.FormEvent<HTMLInputElement>) => processPdfInput(event.currentTarget);
  useEffect(() => {
    const started = Number(sessionStorage.getItem("biblioteca-pdf-picker-open") || 0);
    if (started && Date.now() - started < 120_000) feedback("O Android reiniciou o app antes de devolver o PDF. Seus arquivos já salvos continuam na fila. Para este PDF, abra Arquivos e use Compartilhar → Biblioteca HQ.", "error");
    sessionStorage.removeItem("biblioteca-pdf-picker-open");
  }, []);
  const choosePdfWithSystemPicker = async () => {
    const picker = (window as Window & { showOpenFilePicker?: (options: { multiple: boolean; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<Array<{ getFile: () => Promise<File> }>> }).showOpenFilePicker;
    if (!picker) return;
    try {
      const handles = await picker({ multiple: !editing && !mobilePdfPicker, types: [{ description: "HQs e livros", accept: { "application/pdf": [".pdf"], "application/vnd.comicbook-rar": [".cbr"], "application/vnd.comicbook+zip": [".cbz"], "application/epub+zip": [".epub"], "application/vnd.amazon.ebook": [".azw3"] } }] });
      const files = await Promise.all(handles.map((handle) => handle.getFile()));
      void selectPdfs(files);
    } catch (error) { if ((error as Error).name !== "AbortError") feedback("O seletor alternativo não conseguiu abrir os arquivos.", "error"); }
  };
  useEffect(() => {
    if (!draftHydrated || sharedImportLoaded.current || !new URLSearchParams(window.location.search).has("shared")) return;
    sharedImportLoaded.current = true;
    void (async () => {
      try {
        const files = await takeSharedPdfs();
        if (!files.length) { feedback("Nenhum arquivo foi recebido do compartilhamento.", "error"); return; }
        const next = mergeFiles([...batchPdfs, ...(pdf ? [pdf] : []), ...files]);
        if (!draftUserId) throw new Error("Entre como proprietário para guardar os arquivos compartilhados.");
        await savePendingImport(draftUserId, { pdf: null, batchPdfs: next, cover, batchCovers, form, savedAt: Date.now() });
        setBatchPdfs(next); setPdf(null);
        await clearSharedPdfs();
        feedback(`${files.length} Arquivo(s) recebidos e salvos para revisão.`, "success");
      } catch (error) { feedback(error instanceof Error ? error.message : "Não foi possível guardar os arquivos compartilhados.", "error"); }
    })();
    window.history.replaceState({}, "", window.location.pathname);
  }, [draftHydrated]);
  useEffect(() => {
    const recoverPickerReturn = () => { if (document.visibilityState !== "visible") return; window.setTimeout(() => {
      if (!waitingForPdfPicker.current) return;
      if (pdfInputRef.current?.files?.length) processPdfInput(pdfInputRef.current);
      else { waitingForPdfPicker.current = false; sessionStorage.removeItem("biblioteca-pdf-picker-open"); feedback("O Android não devolveu este PDF ao app. Abra-o em Arquivos e use Compartilhar → Biblioteca HQ; os PDFs anteriores continuam salvos.", "error"); }
    }, 650); };
    window.addEventListener("focus", recoverPickerReturn);
    document.addEventListener("visibilitychange", recoverPickerReturn);
    return () => { window.removeEventListener("focus", recoverPickerReturn); document.removeEventListener("visibilitychange", recoverPickerReturn); };
  });
  const submitComic = async (event: React.FormEvent) => {
    event.preventDefault();
    const series = seriesList.find((item) => item.id === form.seriesId);
    if (!series || !form.title.trim() || (!editing && !pdf) || !/^\d+$/.test(form.issue.trim()) || !form.year || !form.pages) { feedback("Complete título, edição, ano, páginas e arquivo antes de publicar.", "error"); return; }
    if (!series.parentSeriesId && isPhaseTitle(`${form.title} ${pdf?.name || editing?.fileName || ""}`) && seriesList.some((item) => item.parentSeriesId === series.id && item.bannerTone === "phase")) { feedback(`Esta edição parece pertencer a uma fase de “${series.title}”. Selecione a fase antes de publicar.`, "error"); return; }
    if (pdf && pdf.size > 5 * 1024 * 1024 * 1024) { feedback("Cada arquivo pode ter no máximo 5 GB.", "error"); return; }
    setBusy(true);
    try {
      if (!editing) {
        const check = await checkComicDuplicate({ title: form.title.trim(), issueNumber: Number(form.issue), year: Number(form.year), volume: form.volume ? Number(form.volume) : undefined, fileSha256: pdfHash, series });
        if (check.code !== "UNIQUE") { feedback(`${check.message} Use “Revisar como lote” para comparar e escolher entre manter, substituir ou cancelar.`, "error"); return; }
      }
      setNotice("Enviando arquivo e capa...");
      const automaticCover = !cover && pdf ? publicationFormat(pdf.name) === "pdf" ? await extractPdfCover(pdf, pdf.name) : ["cbr", "cbz"].includes(publicationFormat(pdf.name) || "") ? await inspectPublication(pdf) : null : null;
      if (pdf && ["cbr", "cbz"].includes(publicationFormat(pdf.name) || "") && !cover && !automaticCover?.cover) throw new Error("Não foi possível extrair a primeira imagem do arquivo. Confira o arquivo antes de publicar.");
      const uploadedPdf = pdf ? await storageProvider.uploadFile(pdf, "comics", (percent) => setNotice(`Enviando arquivo: ${percent}%`)) : null;
      const finalCover = cover || automaticCover?.cover;
      const uploadedCover = finalCover ? await storageProvider.uploadFile(finalCover, "covers") : null;
      const thumbnail = coverThumbnail || automaticCover?.thumbnail || (cover ? await makeImageThumbnail(cover) : null);
      const uploadedThumb = thumbnail ? await storageProvider.uploadFile(thumbnail, "covers") : null;
      const payload = { title: form.title.trim(), contentType: (pdf && ["epub", "azw3"].includes(publicationFormat(pdf.name) || "") ? "book" : form.contentType) as Comic["contentType"], readingDirection: form.readingDirection as Comic["readingDirection"], issueNumber: Number(form.issue), year: Number(form.year), totalPages: Number(form.pages), fileName: pdf?.name || editing?.fileName || "", fileSizeMb: uploadedPdf?.fileSizeMb ?? editing?.fileSizeMb ?? 0, pdfKey: uploadedPdf?.fileKey || "", coverKey: uploadedCover?.fileKey, coverThumbKey: uploadedThumb?.fileKey, fileSha256: pdfHash, synopsis: form.synopsis.trim(), writers: splitList(form.writers), pencillers: splitList(form.pencillers), colorists: splitList(form.colorists), tags: splitList(form.tags), characters: splitList(form.characters), volume: form.volume ? Number(form.volume) : undefined, series };
      setNotice("Salvando os dados da publicação...");
      let updatedCollectionCount = 0;
      if (editing) {
        await updateComicRecord(editing.id, payload);
        if (applyToCollection) {
          setNotice("Aplicando a ficha editorial a toda a coleção...");
          updatedCollectionCount = await updateCollectionComics(series.id, {
            synopsis: payload.synopsis,
            writers: payload.writers,
            pencillers: payload.pencillers,
            colorists: payload.colorists,
            tags: payload.tags,
          });
        }
      } else await createComicRecord(payload);
      await reloadData(true);
      feedback(editing ? (updatedCollectionCount > 0 ? `Alterações publicadas em ${updatedCollectionCount} edições da coleção.` : "Alterações publicadas com sucesso.") : "HQ cadastrada e publicada com sucesso.");
      setPdf(null); setCover(null);
      if (!editing) setForm((current) => ({ ...current, title: "", issue: "", year: "", pages: "", synopsis: "", writers: "", pencillers: "", colorists: "", tags: "", characters: "", volume: "" }));
    } catch (error) { feedback(error instanceof Error ? error.message : "Não foi possível salvar.", "error"); }
    finally { setBusy(false); }
  };
  const editSeries = (series?: Series) => { setSeriesCover(null); setSeriesForm(series ? { id: series.id, kind: ["saga", "phase", "one_shot"].includes(series.bannerTone || "") ? series.bannerTone! : "collection", parentSeriesId: series.parentSeriesId || "", title: series.title, publisher: series.publisher, startYear: String(series.startYear), endYear: series.endYear ? String(series.endYear) : "", expected: series.totalIssuesExpected ? String(series.totalIssuesExpected) : "", description: series.description, coverKey: series.coverKey || "" } : { id: "", kind: "collection", parentSeriesId: "", title: "", publisher: "", startYear: "", endYear: "", expected: "", description: "", coverKey: "" }); };
  const updateSeriesTitle = (title: string) => setSeriesForm((current) => {
    if (!isPhaseTitle(title)) return { ...current, title };
    const parent = suggestParentSeries(title, current.publisher, seriesList);
    return { ...current, title, kind: "phase", parentSeriesId: parent?.id || current.parentSeriesId, publisher: parent?.publisher || current.publisher };
  });
  const submitSeries = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice("Salvando coleção...");
    try {
      const coverKey = seriesCover ? (await storageProvider.uploadFile(seriesCover, "covers")).fileKey : seriesForm.coverKey;
      const savedSeriesId = await saveSeriesRecord({ id: seriesForm.id || undefined, title: seriesForm.title, publisher: seriesForm.publisher, startYear: Number(seriesForm.startYear), endYear: seriesForm.endYear ? Number(seriesForm.endYear) : undefined, totalIssuesExpected: seriesForm.expected ? Number(seriesForm.expected) : undefined, description: seriesForm.description, bannerTone: seriesForm.kind, parentSeriesId: seriesForm.kind !== "collection" ? seriesForm.parentSeriesId || undefined : undefined, coverKey });
      await reloadData(true); setForm((current) => ({ ...current, seriesId: savedSeriesId })); editSeries(); feedback("Coleção salva e disponível no catálogo, mesmo antes de receber edições.");
    } catch (error) { feedback(error instanceof Error ? error.message : "Não foi possível salvar a coleção.", "error"); }
    finally { setBusy(false); }
  };
  const confirmDelete = async (deleteContents = false) => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      if (deleteTarget.type === "comics") {
        const count = await deleteComicRecords(deleteTarget.ids);
        feedback(`${count} edição(ões) movida(s) para exclusão reversível.`);
        setSelectedIds([]);
      } else {
        await deleteSeriesRecord(deleteTarget.id, deleteContents);
        feedback(deleteContents ? "Agrupamento e edições vinculadas excluídos logicamente." : "Agrupamento excluído; edições mantidas no acervo sem coleção.");
      }
      setDeleteTarget(null);
      await reloadData(true);
    } catch (error) { feedback(error instanceof Error ? error.message : "Não foi possível excluir.", "error"); }
    finally { setBusy(false); }
  };

  const submitBulkEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedIds.length || !bulkEnabled.length) { feedback("Selecione edições e marque os campos que deseja alterar.", "error"); return; }
    const fields: SelectedComicPatch = {};
    for (const field of bulkEnabled) {
      const value = bulkValues[field].trim();
      if (field === "year") {
        const year = Number(value);
        if (!Number.isInteger(year) || year < 1800 || year > 2200) { feedback("Informe um ano válido entre 1800 e 2200.", "error"); return; }
        fields.year = year;
      } else if (field === "seriesId") fields.seriesId = value;
      else if (field === "contentType") fields.contentType = value as Comic["contentType"];
      else if (field === "readingDirection") fields.readingDirection = value as Comic["readingDirection"];
      else if (["characters", "writers", "pencillers", "colorists", "tags"].includes(field)) (fields as Record<string, unknown>)[field] = splitList(value);
      else (fields as Record<string, unknown>)[field] = value;
    }
    if (bulkEnabled.includes("title") && !fields.title) { feedback("O título não pode ficar vazio.", "error"); return; }
    setBusy(true);
    try {
      const count = await updateSelectedComics(selectedIds, fields);
      if (count !== selectedIds.length) throw new Error(`Apenas ${count} de ${selectedIds.length} edições foram encontradas. Recarregue a lista antes de tentar novamente.`);
      await reloadData(true);
      setSelectedIds([]); setBulkOpen(false); setBulkEnabled([]);
      feedback(`${count} edição(ões) atualizada(s) com sucesso.`, "success");
    } catch (error) { feedback(error instanceof Error ? error.message : "Não foi possível editar as edições selecionadas.", "error"); }
    finally { setBusy(false); }
  };

  const closeRowMenu = (event: React.MouseEvent<HTMLButtonElement>) => { event.currentTarget.closest("details")?.removeAttribute("open"); };

  return <div className="streaming-page admin-studio">
    <section className="page-spotlight admin-spotlight"><div><span className="page-kicker"><Shield /> Central do proprietário</span><h1>Estúdio do acervo</h1><p>Cadastre arquivos, capas, coleções e toda a ficha editorial sem sair da Biblioteca HQ.</p></div><div className="page-metrics"><span><strong>{allComics.length}</strong> títulos</span><span><strong>{seriesList.length}</strong> agrupamentos</span><span><strong>{formatFileSize(totalMb)}</strong> em arquivos</span></div></section>
    <div className="studio-tabs" role="tablist"><button className={tab === "catalog" ? "active" : ""} onClick={() => setTab("catalog")}><LibraryBig /> Acervo</button><button className={tab === "collections" ? "active" : ""} onClick={() => setTab("collections")}><BookCopy /> Coleções</button><button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><Shield /> Usuários e PIX</button><button className={tab === "status" ? "active" : ""} onClick={() => setTab("status")}><Cloud /> Sistema</button></div>
    <details className="catalog-organization-guide"><summary>Como organizar editora, coleção, saga, volume e edição</summary><div><p><strong>Editora ou selo</strong> publica a HQ, como DC Comics ou Marvel. Você informa a editora ao criar o agrupamento.</p><p><strong>Coleção</strong> reúne um título contínuo ou uma franquia de leitura, como Action Comics ou Superman. Cadastre-a uma vez e associe suas edições e obras fechadas.</p><p><strong>Saga</strong> é um arco ou evento com começo e fim, como uma história que pode aparecer em várias coleções. Vincule a saga à coleção principal. Se o evento atravessar coleções, escolha a coleção mais representativa para navegação e informe as demais em Categorias / tags.</p><p><strong>Obra fechada</strong> é um encadernado ou minissérie completa em um volume. Cadastre-a como filha da coleção do personagem e associe o PDF como uma edição única.</p><p><strong>Graphic novels de autores independentes</strong>: use a editora real da edição (não o nome do autor). Dentro dela, crie “Graphic Novels” como coleção; para cada livro avulso, crie uma obra fechada filha com o título da obra. Preencha o autor em Roteiro e use uma tag com o nome dele para encontrar suas obras em editoras diferentes.</p><p><strong>Volume</strong> identifica um tomo, encadernado ou fase quando essa divisão existe na publicação. Use apenas quando o material indicar um volume.</p><p><strong>Edição</strong> é a unidade publicada no arquivo, com número, ano, páginas e capa próprios. Para um livro único, use edição 1. Exemplo: Marvel → Vingadores → Dinastia Kang → edição 1.</p><p>Ordem sugerida: crie a coleção, selecione os PDFs, aplique os dados comuns ao lote e revise número, volume, páginas e capa de cada arquivo.</p></div></details>
    {notice && <div className="studio-notice"><CheckCircle2 /> {notice}</div>}
    {toast && <div className={`admin-toast ${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>{toast.type === "error" ? <AlertCircle /> : <CheckCircle2 />}<span>{toast.message}</span><button type="button" aria-label="Fechar aviso" onClick={() => setToast(null)}><X /></button></div>}
    {tab === "catalog" && <div className="studio-grid">
      {batchPdfs.length > 0 && <BatchImport files={batchPdfs} covers={batchCovers} series={seriesList} existingComics={allComics} onComplete={() => reloadData(true)} onClear={() => { setBatchPdfs([]); setBatchCovers([]); }} onFeedback={feedback} />}
      <form className="studio-panel comic-editor" onSubmit={submitComic}>
        <div className="studio-panel-title"><div><span>{editing ? "Editando edição" : "Nova publicação"}</span><h2>{editing?.title || "Cadastrar HQ ou livro"}</h2></div>{editing && <button type="button" onClick={resetComicForm} aria-label="Cancelar edição"><X /></button>}</div>
        <div className="form-grid">
          <label className="span-2">Título{batchPdfs.length > 0 && <small>Gerado pelo nome de cada arquivo na publicação em lote</small>}<input className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required={batchPdfs.length === 0} disabled={batchPdfs.length > 0} /></label>
          <label>Coleção / saga principal<select className={fieldClass} value={form.seriesId} onChange={(e) => setForm({ ...form, seriesId: e.target.value })} required><option value="">Selecione um agrupamento confirmado</option>{seriesList.map((series) => <option key={series.id} value={series.id}>{seriesPath(series, seriesList)}</option>)}</select></label>
          <label>Formato<select className={fieldClass} value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value, readingDirection: e.target.value === "manga" ? "rtl" : "ltr" })}><option value="comic">HQ ocidental</option><option value="graphic_novel">Graphic novel</option><option value="manga">Mangá</option><option value="manhwa">Manhwa</option><option value="book">Livro</option></select></label>
          <label>Sentido da leitura<select className={fieldClass} value={form.readingDirection} onChange={(e) => setForm({ ...form, readingDirection: e.target.value })}><option value="ltr">Esquerda → direita</option><option value="rtl">Direita → esquerda</option></select></label>
          <label>Edição / número<input className={fieldClass} type="number" min="0" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} required /></label>
          <label>Ano<input className={fieldClass} type="number" min="1800" max="2200" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required /></label>
          <label>Páginas<input className={fieldClass} type="number" min="1" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} required /></label>
          <label className="span-2">Sinopse<textarea className={fieldClass} rows={4} value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} /></label>
          <label>Volume (opcional)<input className={fieldClass} type="number" min="1" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} /></label>
          <label>Personagens / grupos<input className={fieldClass} placeholder="Somente os confirmados" value={form.characters} onChange={(e) => setForm({ ...form, characters: e.target.value })} /></label>
          <label>Roteiro<input className={fieldClass} placeholder="Nomes separados por vírgula" value={form.writers} onChange={(e) => setForm({ ...form, writers: e.target.value })} /></label>
          <label>Arte e desenho<input className={fieldClass} placeholder="Nomes separados por vírgula" value={form.pencillers} onChange={(e) => setForm({ ...form, pencillers: e.target.value })} /></label>
          <label>Cores<input className={fieldClass} placeholder="Nomes separados por vírgula" value={form.colorists} onChange={(e) => setForm({ ...form, colorists: e.target.value })} /></label>
          <label>Categorias / tags<input className={fieldClass} placeholder="X-Men, mutantes, aventura" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
        </div>
        {editing && <label className="bulk-edit-toggle"><input type="checkbox" checked={applyToCollection} onChange={(e) => setApplyToCollection(e.target.checked)} /><div><strong>Aplicar ficha editorial a toda a coleção</strong><span>Atualiza sinopse, roteiro, arte, cores e categorias nas {allComics.filter((comic) => comic.seriesId === form.seriesId).length} edições de “{seriesList.find((series) => series.id === form.seriesId)?.title || "esta coleção"}”. Título, número, ano, páginas, PDF e capa continuam individuais.</span></div></label>}
        <div className="upload-grid"><div className="upload-tile"><FileUp /><strong>{batchPdfs.length ? `${batchPdfs.length} arquivos selecionados` : pdf?.name || (editing ? "Substituir arquivo" : mobilePdfPicker ? "Adicionar arquivo à fila" : "Selecionar HQs ou livros")}</strong><small>{pdf ? formatFileSize(pdf.size / 1024 / 1024) : editing?.fileName || (mobilePdfPicker ? "No celular, escolha um arquivo por vez; a fila é salva neste dispositivo" : "PDF, CBR, CBZ, EPUB ou AZW3 · até 5 GB por arquivo")}</small><input ref={pdfInputRef} type="file" aria-label={editing ? "Substituir arquivo" : "Selecionar HQs ou livros"} accept={PUBLICATION_ACCEPT} multiple={!editing && !mobilePdfPicker} onClick={(event) => { if (mobilePdfPicker && !editing) { event.preventDefault(); window.location.assign("/mobile-upload.html"); return; } waitingForPdfPicker.current = true; sessionStorage.setItem("biblioteca-pdf-picker-open", String(Date.now())); }} onInput={handlePdfSelection} onChange={handlePdfSelection} /></div><label className="upload-tile"><FileImage /><strong>{batchCovers.length ? `${batchCovers.length} capas selecionadas` : cover?.name || (editing ? "Substituir capa" : "Adicionar uma ou várias capas")}</strong><small>JPG, PNG ou WebP · nomes iguais aos arquivos fazem a associação automática</small><input type="file" aria-label={editing ? "Substituir capa" : "Selecionar capas"} accept="image/jpeg,image/png,image/webp" multiple={!editing} onChange={(e) => { const files = Array.from(e.currentTarget.files || []); e.currentTarget.value = ""; if (files.length > 1) { setBatchCovers(files); setCover(null); } else { setCover(files[0] || null); setCoverThumbnail(null); setBatchCovers([]); } }} /></label></div>
        {(pdf || batchPdfs.length > 0) && <p className="mobile-upload-help" role="status">{draftSaveState === "saving" ? "Salvando arquivos neste dispositivo..." : draftSaveState === "saved" ? "Fila salva neste dispositivo. Você pode sair e voltar para continuar." : draftSaveState === "error" ? "O armazenamento local falhou; não saia desta tela antes de publicar." : "Preparando rascunho..."}</p>}{mobilePdfPicker && "showOpenFilePicker" in window && <button type="button" className="upload-clear" onClick={() => void choosePdfWithSystemPicker()}>Abrir seletor alternativo de arquivos</button>}
        {mobilePdfPicker && <p className="mobile-upload-help">A seleção abre em uma tela leve e volta para esta fila. Você também pode abrir o arquivo em Arquivos e usar Compartilhar → Biblioteca HQ.</p>}
        {(pdf || batchPdfs.length > 0) && <button type="button" className="upload-clear" onClick={() => { setPdf(null); setBatchPdfs([]); setNotice("Seleção de arquivos limpa."); }}>Limpar arquivos selecionados</button>}
        {pdf && !editing && <button type="button" onClick={() => { setBatchPdfs([pdf]); setPdf(null); }}>Revisar como lote (opções para duplicados)</button>}
        {batchPdfs.length === 0 && <button className="studio-primary" disabled={busy}><UploadCloud /> {busy ? "Publicando..." : editing ? "Salvar alterações" : "Cadastrar e publicar"}</button>}
      </form>
      <section className="studio-panel catalog-manager">
        <div className="studio-panel-title"><div><span>Biblioteca publicada</span><h2>Gerenciar edições</h2></div><strong>{managedComics.length} / {allComics.length}</strong></div>
        <div className="manager-controls">
          <label className="manager-search">Busca<input className={fieldClass} type="search" placeholder="Título, autor, personagem ou arquivo" value={managerSearch} onChange={(event) => setManagerSearch(event.target.value)} /></label>
          <label>Formato<select className={fieldClass} value={managerFormat} onChange={(event) => setManagerFormat(event.target.value)}><option value="all">Todos</option><option value="comic">HQ ocidental</option><option value="graphic_novel">Graphic novel</option><option value="manga">Mangá</option><option value="manhwa">Manhwa</option><option value="book">Livro</option></select></label>
          <label>Editora<select className={fieldClass} value={managerPublisher} onChange={(event) => setManagerPublisher(event.target.value)}><option value="all">Todas</option>{[...new Set(allComics.map((comic) => comic.publisher))].sort().map((publisher) => <option key={publisher} value={publisher}>{publisher}</option>)}</select></label>
          <label>Ano<select className={fieldClass} value={managerYear} onChange={(event) => setManagerYear(event.target.value)}><option value="all">Todos</option>{[...new Set(allComics.map((comic) => comic.year))].sort((a,b) => b-a).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
          <label>Coleção<select className={fieldClass} value={managerSeries} onChange={(event) => setManagerSeries(event.target.value)}><option value="all">Todas</option>{seriesList.map((series) => <option key={series.id} value={series.id}>{seriesPath(series, seriesList)}</option>)}</select></label>
          <label>Arquivo<select className={fieldClass} value={managerStorage} onChange={(event) => setManagerStorage(event.target.value)}><option value="all">Todos</option><option value="present">Arquivo disponível</option><option value="pending">Pendente</option><option value="error">Erro de sincronização</option></select></label>
          <label>Ordenar<select className={fieldClass} value={managerSort} onChange={(event) => setManagerSort(event.target.value)}><option value="recent">Recentes</option><option value="az">Título A–Z</option><option value="za">Título Z–A</option><option value="size">Tamanho do arquivo</option></select></label>
        </div>
        <label className="manager-select-filtered"><input type="checkbox" checked={allFilteredSelected} disabled={!managedComics.length} onChange={(event) => selectFilteredComics(event.target.checked)} /> Selecionar todas as {managedComics.length} edições deste filtro (todas as páginas)</label>
        {selectedIds.length > 0 && <div className="manager-selection-actions"><strong>{selectedIds.length} edição(ões) selecionada(s)</strong><button type="button" className="studio-primary" onClick={() => setBulkOpen((open) => !open)}><Edit3 /> {bulkOpen ? "Fechar edição em bloco" : "Editar selecionadas em bloco"}</button><button type="button" className="admin-delete-action" onClick={() => setDeleteTarget({ type: "comics", ids: selectedIds })}>Excluir selecionadas</button><button type="button" onClick={() => { setSelectedIds([]); setBulkOpen(false); }}>Limpar seleção</button></div>}
        {missingPdfCovers.length > 0 && <div className="manager-selection-actions"><button type="button" className="studio-primary" disabled={!!coverRepair} onClick={() => void repairMissingCovers()}><FileImage /> {coverRepair ? `Recuperando capas: ${coverRepair.done}/${coverRepair.total}` : `Gerar capas ausentes ${selectedIds.length ? "nas selecionadas" : "nos resultados"} (${missingPdfCovers.length})`}</button><span>{coverRepair ? `${coverRepair.fixed} recuperada(s)` : "Usa a primeira página de cada PDF, CBR ou CBZ já publicado; não é preciso reenviar os arquivos."}</span></div>}
        {bulkOpen && selectedIds.length > 0 && <form className="manager-bulk-editor" onSubmit={(event) => void submitBulkEdit(event)}><h3>Editar {selectedIds.length} edições em bloco</h3><p>Marque apenas os campos que devem mudar. Os demais dados, PDFs e capas permanecem individuais. Valores vazios nos campos marcados limpam esse campo.</p><div className="manager-bulk-grid">{bulkFields.map((field) => <label key={field} className={field === "synopsis" ? "wide" : ""}><span><input type="checkbox" checked={bulkEnabled.includes(field)} onChange={(event) => setBulkEnabled((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))} /> {bulkLabels[field]}</span>{field === "seriesId" ? <select value={bulkValues.seriesId} onChange={(event) => setBulkValues((current) => ({ ...current, seriesId: event.target.value }))}><option value="">Sem coleção</option>{seriesList.map((series) => <option key={series.id} value={series.id}>{seriesPath(series, seriesList)}</option>)}</select> : field === "contentType" ? <select value={bulkValues.contentType} onChange={(event) => setBulkValues((current) => ({ ...current, contentType: event.target.value }))}><option value="comic">HQ ocidental</option><option value="graphic_novel">Graphic novel</option><option value="manga">Mangá</option><option value="manhwa">Manhwa</option><option value="book">Livro</option></select> : field === "readingDirection" ? <select value={bulkValues.readingDirection} onChange={(event) => setBulkValues((current) => ({ ...current, readingDirection: event.target.value }))}><option value="ltr">Esquerda → direita</option><option value="rtl">Direita → esquerda</option></select> : field === "synopsis" ? <textarea rows={3} value={bulkValues.synopsis} onChange={(event) => setBulkValues((current) => ({ ...current, synopsis: event.target.value }))} /> : <input type={field === "year" ? "number" : "text"} min={field === "year" ? 1800 : undefined} max={field === "year" ? 2200 : undefined} placeholder={["characters", "writers", "pencillers", "colorists", "tags"].includes(field) ? "Separe por vírgulas" : undefined} value={bulkValues[field]} onChange={(event) => setBulkValues((current) => ({ ...current, [field]: event.target.value }))} />}</label>)}</div><button type="submit" className="studio-primary" disabled={busy || !bulkEnabled.length}>{busy ? "Salvando..." : `Aplicar ${bulkEnabled.length} campo(s) às ${selectedIds.length} edições`}</button></form>}
        <div className="catalog-manager-list">{visibleComics.map((comic) => <article key={comic.id}><input type="checkbox" aria-label={`Selecionar ${comic.title}`} checked={selectedIds.includes(comic.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, comic.id] : current.filter((id) => id !== comic.id))} /><img src={comic.coverUrl} alt="" loading="lazy" /><div><strong>{comic.title}</strong><span>{comic.seriesTitle || "Sem coleção"} · #{comic.issueNumber}</span><small>{comic.year} · {comic.totalPages} páginas · {formatFileSize(comic.fileSizeMb)} · {storageStatuses[comic.id] === "present" ? "Disponível" : storageStatuses[comic.id] === "pending" ? "Pendente" : storageStatuses[comic.id] === "error" ? "Erro no arquivo" : "Verificando…"}</small></div><details className="manager-row-menu"><summary aria-label={`Ações de ${comic.title}`}>Ações</summary><div><button type="button" onClick={(event) => { closeRowMenu(event); startEditing(comic); feedback(`Editor de “${comic.title}” aberto.`, "info"); }}><Edit3 /> Editar metadados</button><button type="button" onClick={(event) => { closeRowMenu(event); startEditing(comic); window.setTimeout(() => document.querySelector<HTMLInputElement>('.comic-editor input[type="file"][accept*="image"]')?.click(), 0); }}><FileImage /> Alterar capa</button><button type="button" onClick={(event) => { closeRowMenu(event); startEditing(comic); window.setTimeout(() => document.querySelector<HTMLInputElement>('.comic-editor input[type="file"][accept*="pdf"]')?.click(), 0); }}><FileUp /> Substituir arquivo</button><button type="button" className="admin-delete-action" onClick={(event) => { closeRowMenu(event); setDeleteTarget({ type: "comics", ids: [comic.id] }); }}>Excluir</button></div></details></article>)}</div>
        {!managedComics.length && <p className="manager-empty">Nenhuma edição corresponde aos filtros.</p>}
        {pageCount > 1 && <div className="manager-pagination"><button disabled={managerPage <= 1} onClick={() => setManagerPage((page) => page - 1)}>Anterior</button><span>Página {managerPage} de {pageCount}</span><button disabled={managerPage >= pageCount} onClick={() => setManagerPage((page) => page + 1)}>Próxima</button></div>}
      </section>
    </div>}
    {tab === "collections" && <><datalist id="registered-publishers">{[...new Set([...seriesList.map((item) => item.publisher), ...publisherNames])].map((publisher) => <option key={publisher} value={publisher} />)}</datalist><AssetsPanel seriesList={seriesList} onSaved={async () => { await Promise.all([reloadData(true), refreshPublisherNames()]); }} /><div className="studio-grid collections-grid">
      <form className="studio-panel" onSubmit={submitSeries}><div className="studio-panel-title"><div><span>{seriesForm.id ? "Editar agrupamento" : "Novo agrupamento"}</span><h2>Coleções e sagas</h2></div>{seriesForm.id && <button type="button" onClick={() => editSeries()}><Plus /></button>}</div><div className="form-grid"><label>Tipo<select className={fieldClass} value={seriesForm.kind} onChange={(e) => setSeriesForm({ ...seriesForm, kind: e.target.value })}><option value="collection">Coleção</option><option value="saga">Saga / arco narrativo</option><option value="phase">Fase / linha editorial</option><option value="one_shot">Obra fechada / volume único</option></select></label><label>Nome<input className={fieldClass} value={seriesForm.title} onChange={(e) => updateSeriesTitle(e.target.value)} required /></label><label>Editora<input className={fieldClass} list="registered-publishers" value={seriesForm.publisher} onChange={(e) => { const publisher = e.target.value; const parent = isPhaseTitle(seriesForm.title) ? suggestParentSeries(seriesForm.title, publisher, seriesList) : undefined; setSeriesForm({ ...seriesForm, publisher, parentSeriesId: parent?.id || seriesForm.parentSeriesId }); }} required /></label>{seriesForm.kind !== "collection" && <label>Coleção principal<select className={fieldClass} required={["one_shot", "phase"].includes(seriesForm.kind)} value={seriesForm.parentSeriesId} onChange={(e) => setSeriesForm({ ...seriesForm, parentSeriesId: e.target.value, publisher: seriesList.find((item) => item.id === e.target.value)?.publisher || seriesForm.publisher })}><option value="">Sem coleção principal</option>{seriesList.filter((item) => !item.parentSeriesId && item.bannerTone !== "saga" && item.bannerTone !== "phase" && item.bannerTone !== "one_shot" && item.id !== seriesForm.id).map((item) => <option key={item.id} value={item.id}>{item.publisher} → {item.title}</option>)}</select></label>}<label>Ano inicial<input className={fieldClass} type="number" value={seriesForm.startYear} onChange={(e) => setSeriesForm({ ...seriesForm, startYear: e.target.value })} required /></label><label>Ano final<input className={fieldClass} type="number" value={seriesForm.endYear} onChange={(e) => setSeriesForm({ ...seriesForm, endYear: e.target.value })} /></label><label>Edições previstas<input className={fieldClass} type="number" value={seriesForm.expected} onChange={(e) => setSeriesForm({ ...seriesForm, expected: e.target.value })} /></label><label className="span-2">Descrição<textarea className={fieldClass} rows={5} value={seriesForm.description} onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })} /></label><label className="span-2">Capa do agrupamento (opcional)<input className={fieldClass} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setSeriesCover(e.target.files?.[0] || null)} />{seriesCover && <span>Nova capa: {seriesCover.name}</span>}{!seriesCover && seriesForm.coverKey && <span>Capa atual mantida</span>}{(seriesCoverPreview || (seriesForm.coverKey && seriesList.find((item) => item.id === seriesForm.id)?.coverUrl)) && <><img className="series-cover-preview" src={seriesCoverPreview || seriesList.find((item) => item.id === seriesForm.id)?.coverUrl} alt="Prévia da capa do agrupamento" /><button type="button" className="admin-delete-action" onClick={() => { setSeriesCover(null); setSeriesForm((current) => ({ ...current, coverKey: "" })); }}>Remover capa</button></>}</label></div><p className="series-organization-hint">Para graphic novels avulsas, use a editora real, crie uma coleção “Graphic Novels” nela e cadastre cada livro como “Obra fechada / volume único”. Preencha o autor em Roteiro e nas tags; não use o autor como editora.</p><button className="studio-primary" disabled={busy}><Save /> Salvar {seriesForm.kind === "saga" ? "saga" : seriesForm.kind === "phase" ? "fase" : seriesForm.kind === "one_shot" ? "obra fechada" : "coleção"}</button></form>
      <section className="studio-panel catalog-manager"><div className="studio-panel-title"><div><span>Organização</span><h2>Coleções e sagas cadastradas</h2></div><strong>{seriesList.length}</strong></div><div className="collection-list">{seriesList.map((series) => <div key={series.id} className="admin-series-row"><button type="button" onClick={() => editSeries(series)}><div><strong>{series.title}</strong><span>{series.bannerTone === "saga" ? "Saga" : series.bannerTone === "phase" ? "Fase" : series.bannerTone === "one_shot" ? "Obra fechada" : "Coleção"} · {series.publisher}{series.parentSeriesId ? ` → ${seriesList.find((item) => item.id === series.parentSeriesId)?.title || "Coleção"}` : ""} · {series.startYear}</span><small>{allComics.filter((comic) => comic.seriesId === series.id).length} edições</small></div><Edit3 /></button><button type="button" className="admin-delete-action" onClick={() => setDeleteTarget({ type: "series", id: series.id })}>Excluir</button></div>)}</div></section>
    </div></>}
    {tab === "users" && <UsersPanel />}
    {tab === "status" && <div className="provider-grid"><article><Database /><div><strong>Catálogo e progresso</strong><span>Dados das publicações e das leituras</span></div></article><article><Cloud /><div><strong>Arquivos e capas</strong><span>Conteúdo disponível para leitura</span></div></article><article><LibraryBig /><div><strong>Páginas cadastradas</strong><span>{totalPages.toLocaleString("pt-BR")} páginas no catálogo</span></div></article></div>}
    {deleteTarget && <div className="admin-confirm-backdrop" role="presentation"><div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-delete-title"><h2 id="admin-delete-title">Confirmar exclusão</h2><p>{deleteTarget.type === "comics" ? `${deleteTarget.ids.length} edição(ões) sairão do catálogo e da leitura. Os arquivos originais não serão apagados.` : `Este agrupamento contém ${allComics.filter((comic) => comic.seriesId === deleteTarget.id).length} edição(ões). Escolha o que acontecerá com elas.`}</p><div><button type="button" onClick={() => setDeleteTarget(null)} disabled={busy}>Cancelar</button>{deleteTarget.type === "series" && <button type="button" onClick={() => void confirmDelete(false)} disabled={busy}>Excluir agrupamento e manter HQs</button>}<button type="button" className="admin-delete-action" onClick={() => void confirmDelete(true)} disabled={busy}>{deleteTarget.type === "series" ? "Excluir agrupamento e HQs" : "Excluir edições"}</button></div></div></div>}
  </div>;
};
