import React, { useMemo, useState } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import type { Comic } from "../../types/comic";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";

export const SeriesPage: React.FC<{ onOpenReader: (id: string) => void }> = ({ onOpenReader }) => {
  const { allComics, seriesList, toggleFavorite, updateProgress, setStatus, isLoading } = useLibrary();
  const [kind, setKind] = useState<"collection" | "saga">("collection");
  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Comic | null>(null);
  const [progress, setProgress] = useState<Comic | null>(null);
  const groups = useMemo(() => seriesList.filter((series) => (series.bannerTone === "saga" ? "saga" : "collection") === kind), [kind, seriesList]);
  const selected = groups[Math.min(active, groups.length - 1)];
  const openGroup = groups.find((group) => group.id === openId);
  const issues = useMemo(() => allComics.filter((comic) => comic.seriesId === openId).sort((a, b) => (a.volume || 0) - (b.volume || 0) || a.issueNumber - b.issueNumber || a.year - b.year), [allComics, openId]);
  const items = useMemo(() => groups.map((group) => {
    const comics = allComics.filter((comic) => comic.seriesId === group.id);
    return { id: group.id, title: group.title, subtitle: `${comics.length} ${comics.length === 1 ? "edição" : "edições"} · ${group.publisher}`, image: comics.find((comic) => comic.coverUrl)?.coverUrl };
  }), [allComics, groups]);
  return <div className="streaming-page series-page space-y-8">
    <div className="page-spotlight"><span className="page-kicker"><Layers /> Universos do acervo</span><h1>Coleções e sagas</h1><p>Descubra uma coleção e explore as edições na ordem de leitura.</p></div>
    <div className="collection-kind-tabs" role="tablist" aria-label="Tipo de agrupamento">
      {(["collection", "saga"] as const).map((option) => <button key={option} role="tab" aria-selected={kind === option} className={kind === option ? "active" : ""} onClick={() => { setKind(option); setActive(0); setOpenId(null); }}>{option === "collection" ? "Coleções" : "Sagas"}<span>{seriesList.filter((series) => (series.bannerTone === "saga" ? "saga" : "collection") === option).length}</span></button>)}
    </div>
    {isLoading ? <div className="empty-collection-kind">Carregando coleções...</div> : openGroup ? <section className="collection-open" key={openGroup.id}>
      <button className="collection-back" onClick={() => setOpenId(null)}><ArrowLeft /> Voltar aos hubs</button>
      <div className="collection-open-heading"><div><span>{openGroup.publisher} · {openGroup.startYear}</span><h2>{openGroup.title}</h2><p>{openGroup.description}</p></div><strong>{issues.length} edições</strong></div>
      {issues.length ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">{issues.map((comic) => <ComicCard key={comic.id} comic={comic} density="compact" onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenDetails={setDetail} onOpenProgressModal={setProgress} onMarkCompleted={(id, total) => setStatus(id, "completed", total)} onResetProgress={(id) => setStatus(id, "not_started", 10)} />)}</div> : <p className="empty-collection-kind">Ainda não há edições nesta coleção.</p>}
    </section> : groups.length ? <section className="collection-hub" aria-label="Explorar coleções e sagas">
      <CoverFlow items={items} activeIndex={active} onChange={setActive} onActivate={(item) => setOpenId(item.id)} label="Capas de coleções e sagas" />
      {selected && <div className="collection-hub-info"><div><span>{selected.publisher} · {selected.startYear}</span><h2>{selected.title}</h2><p>{selected.description || "Conheça todas as edições deste universo."}</p><small>{items[active]?.subtitle}</small></div><button className="catalog-primary-action" onClick={() => setOpenId(selected.id)}>Explorar edições</button></div>}
    </section> : <div className="empty-collection-kind"><Layers /><h2>Nenhuma {kind === "saga" ? "saga" : "coleção"} cadastrada</h2><p>O proprietário pode criar uma em Configurações.</p></div>}
    <ComicDetailModal comic={detail} isOpen={!!detail} onClose={() => setDetail(null)} onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenProgressModal={(comic) => { setDetail(null); setProgress(comic); }} onMarkCompleted={(id, total) => { setStatus(id, "completed", total); setDetail(null); }} onResetProgress={(id) => { setStatus(id, "not_started", 10); setDetail(null); }} />
    <ProgressUpdateModal comic={progress} isOpen={!!progress} onClose={() => setProgress(null)} onSaveProgress={updateProgress} />
  </div>;
};
