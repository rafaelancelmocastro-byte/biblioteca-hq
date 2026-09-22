import React, { useEffect, useMemo, useState } from "react";
import { BookCopy, CheckCircle2, Cloud, Database, Edit3, FileImage, FileUp, LibraryBig, Plus, Save, Shield, UploadCloud, X } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { storageProvider } from "../../services/storageProvider";
import { createComicRecord, saveSeriesRecord, updateCollectionComics, updateComicRecord } from "../../services/comicAdminService";
import type { Comic, Series } from "../../types/comic";
import { formatFileSize } from "../../lib/formatters";

type Tab = "catalog" | "collections" | "status";
const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const fieldClass = "admin-field";
const fileStem = (name: string) => name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
const issueFromFile = (name: string, fallback: number) => Number(name.replace(/\.[^.]+$/, "").match(/(\d{1,4})(?!.*\d)/)?.[1] || fallback);

export const AdminPage: React.FC = () => {
  const { allComics, seriesList, reloadData } = useLibrary();
  const [tab, setTab] = useState<Tab>("catalog");
  const [editing, setEditing] = useState<Comic | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [batchPdfs, setBatchPdfs] = useState<File[]>([]);
  const [batchCovers, setBatchCovers] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [applyToCollection, setApplyToCollection] = useState(false);
  const [form, setForm] = useState({ title: "", seriesId: "", issue: "1", year: String(new Date().getFullYear()), pages: "1", synopsis: "", writers: "", pencillers: "", colorists: "", tags: "" });
  const [seriesForm, setSeriesForm] = useState({ id: "", title: "", publisher: "Marvel", startYear: String(new Date().getFullYear()), endYear: "", expected: "", description: "" });

  useEffect(() => {
    if (!form.seriesId && seriesList[0]) setForm((current) => ({ ...current, seriesId: seriesList[0].id }));
  }, [form.seriesId, seriesList]);

  const totalMb = useMemo(() => allComics.reduce((sum, item) => sum + item.fileSizeMb, 0), [allComics]);
  const totalPages = useMemo(() => allComics.reduce((sum, item) => sum + item.totalPages, 0), [allComics]);
  const resetComicForm = () => {
    setEditing(null); setPdf(null); setCover(null); setBatchPdfs([]); setBatchCovers([]); setNotice(""); setApplyToCollection(false);
    setForm({ title: "", seriesId: seriesList[0]?.id || "", issue: "1", year: String(new Date().getFullYear()), pages: "1", synopsis: "", writers: "", pencillers: "", colorists: "", tags: "" });
  };
  const startEditing = (comic: Comic) => {
    setEditing(comic); setPdf(null); setCover(null); setNotice(""); setApplyToCollection(false);
    setForm({ title: comic.title, seriesId: comic.seriesId, issue: String(comic.issueNumber), year: String(comic.year), pages: String(comic.totalPages), synopsis: comic.synopsis, writers: comic.writers.join(", "), pencillers: comic.pencillers.join(", "), colorists: (comic.colorists || []).join(", "), tags: comic.tags.join(", ") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submitComic = async (event: React.FormEvent) => {
    event.preventDefault();
    const series = seriesList.find((item) => item.id === form.seriesId);
    if (!series || (batchPdfs.length === 0 && (!form.title.trim() || (!editing && !pdf)))) { setNotice("Preencha os dados obrigatórios e selecione o PDF."); return; }
    if ([pdf, ...batchPdfs].filter(Boolean).some((file) => file!.size > 5 * 1024 * 1024 * 1024)) { setNotice("Cada arquivo pode ter no máximo 5 GB no envio direto ao R2."); return; }
    setBusy(true);
    try {
      if (!editing && batchPdfs.length > 0) {
        let published = 0;
        for (const [index, pdfFile] of batchPdfs.entries()) {
          setNotice(`Enviando ${index + 1} de ${batchPdfs.length}: ${pdfFile.name}`);
          const uploadedPdf = await storageProvider.uploadFile(pdfFile, "comics");
          const stem = fileStem(pdfFile.name);
          const matchingCover = batchCovers.find((item) => stem.includes(fileStem(item.name)) || fileStem(item.name).includes(stem)) ?? batchCovers[index] ?? (index === 0 ? cover : null);
          const uploadedCover = matchingCover ? await storageProvider.uploadFile(matchingCover, "covers") : null;
          await createComicRecord({
            title: titleFromFile(pdfFile.name),
            issueNumber: issueFromFile(pdfFile.name, Number(form.issue) + index),
            year: Number(form.year), totalPages: Number(form.pages), fileName: pdfFile.name,
            fileSizeMb: uploadedPdf.fileSizeMb, pdfKey: uploadedPdf.fileKey, coverKey: uploadedCover?.fileKey,
            synopsis: form.synopsis.trim(), writers: splitList(form.writers), pencillers: splitList(form.pencillers), colorists: splitList(form.colorists), tags: splitList(form.tags), series,
          });
          published += 1;
        }
        await reloadData();
        setBatchPdfs([]); setBatchCovers([]);
        setNotice(`${published} arquivos publicados na coleção ${series.title}. Revise títulos, números e páginas na lista ao lado.`);
        return;
      }
      setNotice("Enviando arquivos privados ao Cloudflare R2...");
      const uploadedPdf = pdf ? await storageProvider.uploadFile(pdf, "comics") : null;
      const uploadedCover = cover ? await storageProvider.uploadFile(cover, "covers") : null;
      const payload = { title: form.title.trim(), issueNumber: Number(form.issue), year: Number(form.year), totalPages: Number(form.pages), fileName: pdf?.name || editing?.fileName || "", fileSizeMb: uploadedPdf?.fileSizeMb ?? editing?.fileSizeMb ?? 0, pdfKey: uploadedPdf?.fileKey || editing?.pdfPath || "", coverKey: uploadedCover?.fileKey || editing?.coverPath, synopsis: form.synopsis.trim(), writers: splitList(form.writers), pencillers: splitList(form.pencillers), colorists: splitList(form.colorists), tags: splitList(form.tags), series };
      setNotice("Salvando catálogo e ficha criativa no Supabase...");
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
      await reloadData();
      setNotice(editing ? (updatedCollectionCount > 0 ? `Alterações publicadas em ${updatedCollectionCount} edições da coleção.` : "Alterações publicadas com sucesso.") : "HQ cadastrada e publicada com sucesso.");
      setPdf(null); setCover(null);
      if (!editing) setForm((current) => ({ ...current, title: "", issue: "1", pages: "1", synopsis: "", writers: "", pencillers: "", colorists: "", tags: "" }));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  };
  const editSeries = (series?: Series) => setSeriesForm(series ? { id: series.id, title: series.title, publisher: series.publisher, startYear: String(series.startYear), endYear: series.endYear ? String(series.endYear) : "", expected: series.totalIssuesExpected ? String(series.totalIssuesExpected) : "", description: series.description } : { id: "", title: "", publisher: "Marvel", startYear: String(new Date().getFullYear()), endYear: "", expected: "", description: "" });
  const submitSeries = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice("Salvando coleção...");
    try {
      const savedSeriesId = await saveSeriesRecord({ id: seriesForm.id || undefined, title: seriesForm.title, publisher: seriesForm.publisher, startYear: Number(seriesForm.startYear), endYear: seriesForm.endYear ? Number(seriesForm.endYear) : undefined, totalIssuesExpected: seriesForm.expected ? Number(seriesForm.expected) : undefined, description: seriesForm.description });
      await reloadData(); setForm((current) => ({ ...current, seriesId: savedSeriesId })); editSeries(); setNotice("Coleção salva e disponível no catálogo, mesmo antes de receber edições.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível salvar a coleção."); }
    finally { setBusy(false); }
  };

  return <div className="streaming-page admin-studio">
    <section className="page-spotlight admin-spotlight"><div><span className="page-kicker"><Shield /> Central do proprietário</span><h1>Estúdio do acervo</h1><p>Cadastre arquivos, capas, coleções e toda a ficha editorial sem sair da Biblioteca HQ.</p></div><div className="page-metrics"><span><strong>{allComics.length}</strong> títulos</span><span><strong>{seriesList.length}</strong> coleções</span><span><strong>{formatFileSize(totalMb)}</strong> no R2</span></div></section>
    <div className="studio-tabs" role="tablist"><button className={tab === "catalog" ? "active" : ""} onClick={() => setTab("catalog")}><LibraryBig /> Acervo</button><button className={tab === "collections" ? "active" : ""} onClick={() => setTab("collections")}><BookCopy /> Coleções</button><button className={tab === "status" ? "active" : ""} onClick={() => setTab("status")}><Cloud /> Infraestrutura</button></div>
    {notice && <div className="studio-notice"><CheckCircle2 /> {notice}</div>}
    {tab === "catalog" && <div className="studio-grid">
      <form className="studio-panel comic-editor" onSubmit={submitComic}>
        <div className="studio-panel-title"><div><span>{editing ? "Editando edição" : "Nova publicação"}</span><h2>{editing?.title || "Cadastrar HQ ou livro"}</h2></div>{editing && <button type="button" onClick={resetComicForm} aria-label="Cancelar edição"><X /></button>}</div>
        <div className="form-grid">
          <label className="span-2">Título{batchPdfs.length > 0 && <small>Gerado pelo nome de cada arquivo na publicação em lote</small>}<input className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required={batchPdfs.length === 0} disabled={batchPdfs.length > 0} /></label>
          <label>Coleção<select className={fieldClass} value={form.seriesId} onChange={(e) => setForm({ ...form, seriesId: e.target.value })}>{seriesList.map((series) => <option key={series.id} value={series.id}>{series.title}</option>)}</select></label>
          <label>Edição<input className={fieldClass} type="number" min="1" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} required /></label>
          <label>Ano<input className={fieldClass} type="number" min="1800" max="2200" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required /></label>
          <label>Páginas<input className={fieldClass} type="number" min="1" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} required /></label>
          <label className="span-2">Sinopse<textarea className={fieldClass} rows={4} value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} /></label>
          <label>Roteiro<input className={fieldClass} placeholder="Nomes separados por vírgula" value={form.writers} onChange={(e) => setForm({ ...form, writers: e.target.value })} /></label>
          <label>Arte e desenho<input className={fieldClass} placeholder="Nomes separados por vírgula" value={form.pencillers} onChange={(e) => setForm({ ...form, pencillers: e.target.value })} /></label>
          <label>Cores<input className={fieldClass} placeholder="Nomes separados por vírgula" value={form.colorists} onChange={(e) => setForm({ ...form, colorists: e.target.value })} /></label>
          <label>Categorias / tags<input className={fieldClass} placeholder="X-Men, mutantes, aventura" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
        </div>
        {editing && <label className="bulk-edit-toggle"><input type="checkbox" checked={applyToCollection} onChange={(e) => setApplyToCollection(e.target.checked)} /><div><strong>Aplicar ficha editorial a toda a coleção</strong><span>Atualiza sinopse, roteiro, arte, cores e categorias nas {allComics.filter((comic) => comic.seriesId === form.seriesId).length} edições de “{seriesList.find((series) => series.id === form.seriesId)?.title || "esta coleção"}”. Título, número, ano, páginas, PDF e capa continuam individuais.</span></div></label>}
        <div className="upload-grid"><label className="upload-tile"><FileUp /><strong>{batchPdfs.length ? `${batchPdfs.length} PDFs selecionados` : pdf?.name || (editing ? "Substituir PDF" : "Selecionar um ou vários PDFs")}</strong><small>{pdf ? formatFileSize(pdf.size / 1024 / 1024) : editing?.fileName || "Envio direto ao R2 · até 5 GB por arquivo"}</small><input type="file" accept="application/pdf,.pdf" multiple={!editing} onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 1) { setBatchPdfs(files); setPdf(null); } else { setPdf(files[0] || null); setBatchPdfs([]); } }} /></label><label className="upload-tile"><FileImage /><strong>{batchCovers.length ? `${batchCovers.length} capas selecionadas` : cover?.name || (editing ? "Substituir capa" : "Adicionar uma ou várias capas")}</strong><small>JPG, PNG ou WebP · nomes iguais aos PDFs fazem a associação automática</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple={!editing} onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 1) { setBatchCovers(files); setCover(null); } else { setCover(files[0] || null); setBatchCovers([]); } }} /></label></div>
        {batchPdfs.length > 0 && <div className="batch-upload-summary"><strong>Fila de publicação</strong><span>{batchPdfs.map((file) => file.name).join(" · ")}</span><small>O número da edição será identificado pelo último número do nome do arquivo.</small></div>}
        <button className="studio-primary" disabled={busy}><UploadCloud /> {busy ? "Publicando..." : batchPdfs.length ? `Publicar ${batchPdfs.length} arquivos` : editing ? "Salvar alterações" : "Cadastrar e publicar"}</button>
      </form>
      <section className="studio-panel catalog-manager"><div className="studio-panel-title"><div><span>Biblioteca publicada</span><h2>Gerenciar edições</h2></div><strong>{allComics.length}</strong></div><div className="catalog-manager-list">{allComics.map((comic) => <article key={comic.id}><img src={comic.coverUrl} alt="" /><div><strong>{comic.title}</strong><span>{comic.seriesTitle} · #{comic.issueNumber}</span><small>{comic.year} · {comic.totalPages} páginas</small></div><button onClick={() => startEditing(comic)}><Edit3 /> Editar</button></article>)}</div></section>
    </div>}
    {tab === "collections" && <div className="studio-grid collections-grid">
      <form className="studio-panel" onSubmit={submitSeries}><div className="studio-panel-title"><div><span>{seriesForm.id ? "Editar coleção" : "Nova coleção"}</span><h2>Séries, arcos e categorias</h2></div>{seriesForm.id && <button type="button" onClick={() => editSeries()}><Plus /></button>}</div><div className="form-grid"><label className="span-2">Nome da coleção<input className={fieldClass} value={seriesForm.title} onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })} required /></label><label>Editora<input className={fieldClass} value={seriesForm.publisher} onChange={(e) => setSeriesForm({ ...seriesForm, publisher: e.target.value })} required /></label><label>Ano inicial<input className={fieldClass} type="number" value={seriesForm.startYear} onChange={(e) => setSeriesForm({ ...seriesForm, startYear: e.target.value })} required /></label><label>Ano final<input className={fieldClass} type="number" value={seriesForm.endYear} onChange={(e) => setSeriesForm({ ...seriesForm, endYear: e.target.value })} /></label><label>Edições previstas<input className={fieldClass} type="number" value={seriesForm.expected} onChange={(e) => setSeriesForm({ ...seriesForm, expected: e.target.value })} /></label><label className="span-2">Descrição<textarea className={fieldClass} rows={5} value={seriesForm.description} onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })} /></label></div><button className="studio-primary" disabled={busy}><Save /> Salvar coleção</button></form>
      <section className="studio-panel catalog-manager"><div className="studio-panel-title"><div><span>Organização</span><h2>Coleções cadastradas</h2></div><strong>{seriesList.length}</strong></div><div className="collection-list">{seriesList.map((series) => <button key={series.id} onClick={() => editSeries(series)}><div><strong>{series.title}</strong><span>{series.publisher} · {series.startYear}</span><small>{allComics.filter((comic) => comic.seriesId === series.id).length} edições</small></div><Edit3 /></button>)}</div></section>
    </div>}
    {tab === "status" && <div className="provider-grid"><article><Database /><div><strong>Supabase</strong><span>Catálogo, metadados e progresso</span></div><em>Conectado</em></article><article><Cloud /><div><strong>Cloudflare R2</strong><span>PDFs e capas em armazenamento privado</span></div><em>Conectado</em></article><article><LibraryBig /><div><strong>PDF.js</strong><span>{totalPages.toLocaleString("pt-BR")} páginas prontas para leitura</span></div><em>Ativo</em></article></div>}
  </div>;
};
