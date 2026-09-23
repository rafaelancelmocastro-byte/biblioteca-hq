import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import type { Comic } from "../../types/comic";

export function LaunchesPage({ onOpenReader }: { onOpenReader: (id: string) => void }) {
  const { allComics, toggleFavorite, updateProgress, setStatus } = useLibrary();
  const comics = useMemo(() => allComics.filter((comic) => comic.year === 2026), [allComics]);
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Comic | null>(null);
  const [progress, setProgress] = useState<Comic | null>(null);
  const selected = comics[Math.min(active, comics.length - 1)];
  return <div className="streaming-page space-y-8"><header className="page-spotlight"><span className="page-kicker"><Sparkles /> Publicadas em 2026</span><h1>Edições de 2026</h1><p>As edições publicadas em 2026 aparecem aqui quando são adicionadas à biblioteca.</p></header>
    {comics.length ? <><section className="collection-hub"><CoverFlow items={comics.slice(0, 8).map((comic) => ({ id: comic.id, title: comic.title, subtitle: `${comic.publisher} · ${comic.totalPages} páginas`, image: comic.coverUrl }))} activeIndex={active} onChange={setActive} onActivate={(item) => setDetail(comics.find((comic) => comic.id === item.id) || null)} label="Destaques de 2026" />{selected && <div className="collection-hub-info"><div><span>{selected.publisher} · 2026</span><h2>{selected.title}</h2><p>{selected.synopsis}</p></div><button className="catalog-primary-action" onClick={() => onOpenReader(selected.id)}>Ler agora</button></div>}</section><section><h2 className="text-xl font-bold mb-4">Todas as edições de 2026</h2><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">{comics.map((comic) => <ComicCard key={comic.id} comic={comic} density="compact" onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenDetails={setDetail} onOpenProgressModal={setProgress} onMarkCompleted={(id, total) => setStatus(id, "completed", total)} onResetProgress={(id) => setStatus(id, "not_started", 10)} />)}</div></section></> : <div className="empty-collection-kind">Ainda não há edições de 2026 cadastradas.</div>}
    <ComicDetailModal comic={detail} isOpen={!!detail} onClose={() => setDetail(null)} onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenProgressModal={setProgress} onMarkCompleted={(id, total) => setStatus(id, "completed", total)} onResetProgress={(id) => setStatus(id, "not_started", 10)} />
    <ProgressUpdateModal comic={progress} isOpen={!!progress} onClose={() => setProgress(null)} onSaveProgress={updateProgress} />
  </div>;
}
