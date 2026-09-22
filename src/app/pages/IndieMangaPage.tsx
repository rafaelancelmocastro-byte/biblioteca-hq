import React, { useMemo, useState } from "react";
import { BookOpen, Compass } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import type { Comic } from "../../types/comic";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";

export const IndieMangaPage: React.FC<{ onOpenReader: (id: string) => void }> = ({ onOpenReader }) => {
  const { allComics, toggleFavorite, updateProgress, setStatus, isLoading } = useLibrary();
  const [type, setType] = useState("all");
  const [detail, setDetail] = useState<Comic | null>(null);
  const [progress, setProgress] = useState<Comic | null>(null);
  const books = useMemo(() => allComics.filter((comic) => {
    const eligible = ["graphic_novel", "manga", "manhwa"].includes(comic.contentType || "") || /image|dark horse|vertigo|independente|indie/i.test(comic.publisher);
    return eligible && (type === "all" || comic.contentType === type);
  }), [allComics, type]);
  return <div className="streaming-page indie-page space-y-8">
    <div className="page-spotlight"><span className="page-kicker"><Compass /> Fora do convencional</span><h1>Multiverso Indie & Mangás</h1><p>Graphic novels autorais, quadrinhos independentes e leitura oriental.</p></div>
    <div className="collection-kind-tabs indie-tabs" role="tablist" aria-label="Filtrar formato">{[["all", "Todos"], ["graphic_novel", "Graphic novels"], ["manga", "Mangás"], ["manhwa", "Manhwas"]].map(([value, label]) => <button key={value} role="tab" aria-selected={type === value} className={type === value ? "active" : ""} onClick={() => setType(value)}>{label}</button>)}</div>
    {isLoading ? <div className="empty-collection-kind">Carregando obras...</div> : books.length ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">{books.map((comic) => <ComicCard key={comic.id} comic={comic} density="compact" onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenDetails={setDetail} onOpenProgressModal={setProgress} onMarkCompleted={(id, total) => setStatus(id, "completed", total)} onResetProgress={(id) => setStatus(id, "not_started", 10)} />)}</div> : <div className="empty-collection-kind"><BookOpen /><h2>Nenhuma obra nesta categoria ainda</h2><p>O proprietário pode escolher o formato e a direção de leitura ao cadastrar uma edição.</p></div>}
    <ComicDetailModal comic={detail} isOpen={!!detail} onClose={() => setDetail(null)} onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenProgressModal={(comic) => { setDetail(null); setProgress(comic); }} onMarkCompleted={(id, total) => { setStatus(id, "completed", total); setDetail(null); }} onResetProgress={(id) => { setStatus(id, "not_started", 10); setDetail(null); }} />
    <ProgressUpdateModal comic={progress} isOpen={!!progress} onClose={() => setProgress(null)} onSaveProgress={updateProgress} />
  </div>;
};
