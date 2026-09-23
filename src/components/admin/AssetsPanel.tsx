import { useEffect, useState } from "react";
import { FileImage, UploadCloud } from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { storageProvider } from "../../services/storageProvider";
import type { Series } from "../../types/comic";
import { saveSeriesRecord } from "../../services/comicAdminService";

export function AssetsPanel({ seriesList, onSaved }: { seriesList: Series[]; onSaved: () => void | Promise<void> }) {
  const [publisher, setPublisher] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [assets, setAssets] = useState<{ publisher: string; logo_key: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [seriesImage, setSeriesImage] = useState<File | null>(null);
  const [seriesKey, setSeriesKey] = useState("");
  const refresh = async () => { const { data } = await supabase!.from("publisher_assets").select("publisher,logo_key").order("publisher"); setAssets(data || []); };
  useEffect(() => { void refresh(); }, []);
  const keys = [...new Set([...assets.map((item) => item.logo_key), ...seriesList.map((item) => item.coverKey).filter((key): key is string => !!key)])];
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase || !publisher.trim()) return;
    setBusy(true); setMessage("");
    try { const key = image ? (await storageProvider.uploadFile(image, "covers")).fileKey : selectedKey; if (!key) throw new Error("Selecione uma imagem existente ou envie uma nova."); const { error } = await supabase.from("publisher_assets").upsert({ publisher: publisher.trim(), logo_key: key }, { onConflict: "publisher" }); if (error) throw error; setMessage("Logo da editora atualizada."); setImage(null); setSelectedKey(""); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao salvar o logo."); }
    finally { setBusy(false); }
  };
  const saveSeriesImage = async (event: React.FormEvent) => {
    event.preventDefault(); const series = seriesList.find((item) => item.id === seriesId); if (!series) return;
    setBusy(true); setMessage("");
    try { const coverKey = seriesImage ? (await storageProvider.uploadFile(seriesImage, "covers")).fileKey : seriesKey; if (!coverKey) throw new Error("Selecione uma arte existente ou envie uma nova."); await saveSeriesRecord({ ...series, coverKey }); setMessage(`Arte de ${series.title} atualizada.`); setSeriesImage(null); setSeriesKey(""); await onSaved(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao salvar a arte."); }
    finally { setBusy(false); }
  };
  return <section className="studio-panel mt-5"><div className="studio-panel-title"><div><span>Imagens de navegação</span><h2>Logos de editoras e artes de sagas</h2></div><FileImage className="text-amber-400" /></div><p className="text-xs text-slate-400 mb-4">Escolha aqui os logos das editoras e as capas das coleções e sagas. Para alterar a capa de uma edição, use a aba Acervo.</p><form onSubmit={save} className="form-grid"><label>Editora<select className="admin-field" value={publisher} onChange={(event) => setPublisher(event.target.value)} required><option value="">Selecione</option>{[...new Set(seriesList.map((item) => item.publisher))].sort().map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label>Logo PNG, JPG ou WebP<input className="admin-field" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label><label className="span-2">Ou escolher uma imagem já enviada<select className="admin-field" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}><option value="">Nenhum</option>{keys.map((key) => <option key={key} value={key}>{key}</option>)}</select></label><button className="studio-primary span-2" disabled={busy}><UploadCloud /> {busy ? "Enviando..." : "Salvar logo da editora"}</button></form><div className="mt-5 border-t border-white/10 pt-5"><h3 className="font-bold mb-3">Arte da franquia ou saga</h3><form onSubmit={saveSeriesImage} className="form-grid"><label>Coleção ou saga<select className="admin-field" required value={seriesId} onChange={(event) => setSeriesId(event.target.value)}><option value="">Selecione</option>{seriesList.map((item) => <option key={item.id} value={item.id}>{item.publisher} · {item.title}</option>)}</select></label><label>Arte temática<input className="admin-field" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setSeriesImage(event.target.files?.[0] || null)} /></label><label className="span-2">Ou escolher uma imagem já enviada<select className="admin-field" value={seriesKey} onChange={(event) => setSeriesKey(event.target.value)}><option value="">Nenhum</option>{keys.map((key) => <option key={key} value={key}>{key}</option>)}</select></label><button className="studio-primary span-2" disabled={busy}><UploadCloud /> Salvar arte da coleção</button></form></div>{message && <p role="status" className="text-xs text-amber-300 mt-3">{message}</p>}<div className="mt-4 flex flex-wrap gap-2">{assets.map((asset) => <span key={asset.publisher} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{asset.publisher}</span>)}</div></section>;
}
