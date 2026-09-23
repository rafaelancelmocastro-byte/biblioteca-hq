import { useEffect, useMemo, useState } from "react";
import { FileImage, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { storageProvider } from "../../services/storageProvider";
import { getAssetUrls } from "../../services/assetUrls";
import type { Series } from "../../types/comic";
import { saveSeriesRecord } from "../../services/comicAdminService";

type PublisherAsset = { publisher: string; logo_key: string };

export function AssetsPanel({ seriesList, onSaved }: { seriesList: Series[]; onSaved: () => void | Promise<void> }) {
  const [assets, setAssets] = useState<PublisherAsset[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [seriesImage, setSeriesImage] = useState<File | null>(null);
  const [seriesKey, setSeriesKey] = useState("");
  const publishers = useMemo(() => [...new Set([...seriesList.map((item) => item.publisher), ...assets.map((item) => item.publisher)])].sort((a, b) => a.localeCompare(b, "pt-BR")), [assets, seriesList]);
  const current = assets.find((item) => item.publisher === selected);
  const keys = [...new Set([...assets.map((item) => item.logo_key), ...seriesList.map((item) => item.coverKey).filter((key): key is string => !!key)].filter(Boolean))];

  const refresh = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("publisher_assets").select("publisher,logo_key").order("publisher");
    if (error) throw error;
    setAssets(data || []);
  };
  useEffect(() => { void refresh().catch(() => setMessage("Não foi possível carregar as editoras.")); }, []);
  useEffect(() => { if (keys.length) void getAssetUrls(keys).then(setUrls); }, [assets, seriesList]);
  useEffect(() => {
    if (!image) { setPreview(""); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const choose = (publisher: string) => { setSelected(publisher); setName(publisher); setImage(null); setRemoveLogo(false); setMessage(""); };
  const request = async (body: Record<string, unknown>) => {
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
    const response = await fetch("/api/series/upsert", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...body, publisherAction: body.action }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || "Não foi possível salvar a editora.");
    return result;
  };
  const savePublisher = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const logoKey = image ? (await storageProvider.uploadFile(image, "covers")).fileKey : removeLogo ? "" : current?.logo_key || "";
      const wasEditing = !!selected;
      await request({ action: wasEditing ? "update" : "create", originalName: selected, name: name.trim(), logoKey });
      await refresh(); await onSaved(); choose(name.trim());
      setMessage(wasEditing ? "Editora atualizada com sucesso." : "Editora criada. Agora você pode criar coleções para ela.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar a editora."); }
    finally { setBusy(false); }
  };
  const deletePublisher = async () => {
    if (!selected || !window.confirm(`Excluir a editora “${selected}” e sua capa? Coleções e edições vinculadas impedem a exclusão.`)) return;
    setBusy(true); setMessage("");
    try { await request({ action: "delete", originalName: selected }); await refresh(); await onSaved(); choose(""); setMessage("Editora e capa removidas com sucesso."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível excluir a editora."); }
    finally { setBusy(false); }
  };
  const saveSeriesImage = async (event: React.FormEvent) => {
    event.preventDefault(); const series = seriesList.find((item) => item.id === seriesId); if (!series) return;
    setBusy(true); setMessage("");
    try { const coverKey = seriesImage ? (await storageProvider.uploadFile(seriesImage, "covers")).fileKey : seriesKey; if (!coverKey) throw new Error("Selecione uma arte existente ou envie uma nova."); await saveSeriesRecord({ ...series, coverKey }); setMessage(`Arte de ${series.title} atualizada.`); setSeriesImage(null); setSeriesKey(""); await onSaved(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao salvar a arte."); }
    finally { setBusy(false); }
  };
  const currentLogo = !removeLogo && current?.logo_key ? urls[current.logo_key] : "";

  return <section className="studio-panel mt-5 publisher-manager"><div className="studio-panel-title"><div><span>Organização do acervo</span><h2>Editoras e capas</h2></div><FileImage className="text-amber-400" /></div>
    <p className="text-xs text-slate-400 mb-4">Cadastre a editora antes de criar suas coleções. A capa aparece na navegação por editoras.</p>
    <div className="publisher-manager-list" aria-label="Editoras cadastradas">{publishers.map((publisher) => { const key = assets.find((item) => item.publisher === publisher)?.logo_key || ""; return <button key={publisher} type="button" className={selected === publisher ? "active" : ""} onClick={() => choose(publisher)}>{key && urls[key] ? <img src={urls[key]} alt="" /> : <FileImage />}<span>{publisher}</span></button>; })}</div>
    <form className="form-grid mt-4" onSubmit={savePublisher}><div className="studio-panel-title span-2"><div><span>{selected ? "Editar editora" : "Nova editora"}</span><h3>{selected || "Cadastrar editora"}</h3></div>{selected && <button type="button" onClick={() => choose("")} aria-label="Criar nova editora"><Plus /></button>}</div><label className="span-2">Nome da editora<input className="admin-field" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="Ex.: Pipoca & Nanquim" /></label><label className="span-2">Capa ou logo (opcional)<input className="admin-field" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setImage(event.target.files?.[0] || null); setRemoveLogo(false); }} /></label>{(preview || currentLogo) && <div className="publisher-cover-preview span-2"><img src={preview || currentLogo} alt={`Capa de ${name}`} /><button type="button" onClick={() => { setImage(null); setRemoveLogo(true); }}>Remover capa</button></div>}{removeLogo && <p className="span-2 text-xs text-slate-400">A capa será removida ao salvar a editora.</p>}<div className="span-2 publisher-manager-actions"><button className="studio-primary" disabled={busy}><Save /> {busy ? "Salvando..." : selected ? "Salvar alterações" : "Criar editora"}</button>{selected && <button type="button" className="admin-delete-action" disabled={busy} onClick={() => void deletePublisher()}><Trash2 /> Excluir editora</button>}</div></form>
    <div className="mt-5 border-t border-white/10 pt-5"><h3 className="font-bold mb-3">Arte de coleção ou saga</h3><form onSubmit={saveSeriesImage} className="form-grid"><label>Coleção ou saga<select className="admin-field" required value={seriesId} onChange={(event) => setSeriesId(event.target.value)}><option value="">Selecione</option>{seriesList.map((item) => <option key={item.id} value={item.id}>{item.publisher} · {item.title}</option>)}</select></label><label>Nova arte<input className="admin-field" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setSeriesImage(event.target.files?.[0] || null)} /></label><label className="span-2">Ou escolher uma imagem já enviada<select className="admin-field" value={seriesKey} onChange={(event) => setSeriesKey(event.target.value)}><option value="">Nenhuma</option>{keys.map((key) => <option key={key} value={key}>{key}</option>)}</select></label><button className="studio-primary span-2" disabled={busy}><UploadCloud /> Salvar arte da coleção</button></form></div>
    {message && <p role="status" className="text-xs text-amber-300 mt-3">{message}</p>}
  </section>;
}
