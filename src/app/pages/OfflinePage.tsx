import { useEffect, useState } from "react";
import { HardDriveDownload, Trash2 } from "lucide-react";
import { clearOffline, listOffline, removeOffline, verifyOffline } from "../../services/offlineLibrary";
import type { Comic } from "../../types/comic";

type Saved = { comic: Comic; size: number; savedAt: string; cover?: Blob };
export function OfflinePage({ userId, onOpenReader }: { userId: string; onOpenReader: (id: string) => void }) {
  const [items, setItems] = useState<Saved[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [check, setCheck] = useState("");
  const [checking, setChecking] = useState(false);
  const refresh = async () => setItems(await listOffline(userId));
  useEffect(() => { void refresh(); }, [userId]);
  useEffect(() => { const urls: Record<string, string> = {}; for (const item of items) if (item.cover) urls[item.comic.id] = URL.createObjectURL(item.cover); setCovers(urls); return () => Object.values(urls).forEach(URL.revokeObjectURL); }, [items]);
  const totalMb = items.reduce((sum, item) => sum + item.size, 0) / (1024 * 1024);
  return <div className="streaming-page space-y-7"><header className="page-spotlight"><span className="page-kicker"><HardDriveDownload /> No seu dispositivo</span><h1>Salvos para ler offline</h1><p>Leitura disponível neste navegador mesmo sem conexão. O espaço usado é exclusivo deste dispositivo.</p></header>
    <div className="flex flex-wrap justify-between items-center gap-3"><p className="text-sm text-slate-300">{items.length} {items.length === 1 ? "edição" : "edições"} · {totalMb.toFixed(1)} MB usados</p>{items.length > 0 && <div className="flex flex-wrap gap-2"><button className="catalog-secondary-action" disabled={checking} onClick={async () => { setChecking(true); const failed: string[] = []; let done = 0; for (const item of items) { try { await verifyOffline(userId, item.comic.id); } catch { failed.push(item.comic.title); } done++; setCheck(`Verificando arquivos offline: ${done}/${items.length}`); } setCheck(failed.length ? `${failed.length} arquivo(s) precisam ser salvos novamente: ${failed.join(", ")}` : `${done} arquivo(s) verificados e prontos para leitura sem internet.`); setChecking(false); }}>Verificar arquivos offline</button><button className="catalog-secondary-action" onClick={async () => { if (!window.confirm("Remover todas as edições salvas neste dispositivo?")) return; await clearOffline(userId); await refresh(); }}><Trash2 className="w-4 h-4" /> Liberar espaço offline</button></div>}</div>
    {check && <p role="status" className="text-sm text-slate-300">{check}</p>}
    {items.length ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{items.map((item) => <article key={item.comic.id} className="studio-panel !p-3"><button onClick={() => onOpenReader(item.comic.id)} className="w-full text-left"><div className="aspect-[2/3] rounded-lg bg-white/5 overflow-hidden">{covers[item.comic.id] && <img src={covers[item.comic.id]} alt="" className="w-full h-full object-cover" />}</div><h2 className="font-bold text-sm mt-3 line-clamp-2">{item.comic.title}</h2><span className="text-xs text-amber-300">Disponível offline · {(item.size / 1048576).toFixed(1)} MB</span></button><button className="mt-3 text-xs text-rose-300" onClick={async () => { await removeOffline(userId, item.comic.id); await refresh(); }}>Remover deste dispositivo</button></article>)}</div> : <div className="studio-panel text-sm text-slate-300">Abra os detalhes de uma HQ e toque em “Disponibilizar Offline no App”.</div>}
  </div>;
}
