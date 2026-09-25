import { useEffect, useMemo, useState } from "react";
import { BookOpen, Heart, Info, Sparkles } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import type { Comic } from "../../types/comic";

type LaunchView = "recent" | "year";
type LaunchSort = "recent" | "title" | "size";
const addedTime = (comic: Comic) => new Date(comic.addedAt).getTime() || 0;

export function LaunchesPage({ onOpenReader }: { onOpenReader: (id: string) => void }) {
  const { allComics, toggleFavorite, updateProgress, setStatus, isLoading } = useLibrary();
  const [view, setView] = useState<LaunchView>("recent");
  const [year, setYear] = useState<number | null>(null);
  const [sort, setSort] = useState<LaunchSort>("recent");
  const [visibleCount, setVisibleCount] = useState(48);
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Comic | null>(null);
  const [progress, setProgress] = useState<Comic | null>(null);

  const years = useMemo(() => [...new Set(allComics.map((comic) => comic.year).filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => b - a), [allComics]);
  const selectedYear = year && years.includes(year) ? year : years[0];
  const filtered = useMemo(() => view === "year" ? allComics.filter((comic) => comic.year === selectedYear) : allComics, [allComics, selectedYear, view]);
  const latestFirst = useMemo(() => [...filtered].sort((a, b) => addedTime(b) - addedTime(a) || b.year - a.year || a.title.localeCompare(b.title, "pt-BR")), [filtered]);
  const comics = useMemo(() => {
    if (sort === "title") return [...filtered].sort((a, b) => a.title.localeCompare(b.title, "pt-BR") || a.issueNumber - b.issueNumber);
    if (sort === "size") return [...filtered].sort((a, b) => b.fileSizeMb - a.fileSizeMb || addedTime(b) - addedTime(a));
    return latestFirst;
  }, [filtered, latestFirst, sort]);
  const featured = latestFirst.slice(0, 8);
  const selected = featured[Math.min(active, featured.length - 1)];
  useEffect(() => { setActive(0); setVisibleCount(48); }, [view, selectedYear]);
  useEffect(() => { setVisibleCount(48); }, [sort]);

  return (
    <div className="streaming-page launches-page space-y-8 sm:space-y-10">
      <header className="page-spotlight launches-spotlight">
        <span className="page-kicker"><Sparkles /> Novidades do acervo</span>
        <h1>Lançamentos</h1>
        <p>Explore as HQs recém-adicionadas e as edições dos anos mais recentes do acervo.</p>
        {!isLoading && <span className="launches-total">{allComics.length} {allComics.length === 1 ? "edição no acervo" : "edições no acervo"}</span>}
      </header>

      <div className="launches-toolbar">
        <div className="launches-switcher" role="group" aria-label="Mostrar lançamentos">
          <button type="button" className={view === "recent" ? "active" : ""} aria-pressed={view === "recent"} onClick={() => setView("recent")}>Recém-Adicionadas</button>
          <button type="button" className={view === "year" ? "active" : ""} aria-pressed={view === "year"} disabled={!years.length} onClick={() => setView("year")}>Lançamentos do Ano</button>
        </div>
        {view === "year" && selectedYear && <label className="launches-year">Ano <select value={selectedYear} onChange={(event) => setYear(Number(event.target.value))} aria-label="Selecionar ano de publicação">{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
      </div>

      {isLoading ? (
        <div className="empty-collection-kind" role="status">Carregando edições...</div>
      ) : comics.length ? (
        <>
          <section className="collection-hub launches-feature" aria-label={view === "year" ? `Destaques de ${selectedYear}` : "Edições recém-adicionadas"}>
            {selected?.coverUrl && <img className="launches-feature-art" src={selected.coverUrl} alt="" aria-hidden="true" />}
            <div className="launches-feature-content">
              <div className="launches-section-label"><Sparkles aria-hidden="true" /> Em destaque</div>
              <CoverFlow
                items={featured.map((comic) => ({ id: comic.id, title: comic.title, subtitle: `${comic.publisher} · ${comic.totalPages} páginas`, image: comic.coverUrl }))}
                activeIndex={active}
                onChange={setActive}
                onActivate={(item) => setDetail(featured.find((comic) => comic.id === item.id) || null)}
                label="Edições em destaque"
              />
              {selected && <div className="collection-hub-info launches-feature-info">
                <div>
                  <div className="launches-badges"><span>{selected.year}</span><span>{selected.publisher}</span><span>{selected.totalPages} páginas</span></div>
                  <h2>{selected.title}</h2>
                  <p>{selected.synopsis || `Uma nova história para descobrir no acervo.`}</p>
                </div>
                <div className="launches-feature-actions">
                  <button type="button" className="catalog-primary-action" onClick={() => onOpenReader(selected.id)}><BookOpen /> Ler agora</button>
                  <button type="button" className="catalog-secondary-action" onClick={() => setDetail(selected)}><Info /> Ver detalhes</button>
                  <button type="button" className={`catalog-secondary-action launches-favorite ${selected.isFavorite ? "active" : ""}`} aria-pressed={!!selected.isFavorite} onClick={() => void toggleFavorite(selected.id)}><Heart fill={selected.isFavorite ? "currentColor" : "none"} /> {selected.isFavorite ? "Favoritado" : "Favoritar"}</button>
                </div>
              </div>}
            </div>
          </section>

          <section className="streaming-section" aria-labelledby="launches-all-title">
            <div className="launches-list-heading">
              <div><span className="launches-section-label"><Sparkles aria-hidden="true" /> {view === "year" ? `Publicadas em ${selectedYear}` : "Adicionadas recentemente"}</span><h2 id="launches-all-title" className="streaming-heading">Todas as edições</h2></div>
              <div className="launches-list-controls"><span>{comics.length} {comics.length === 1 ? "edição encontrada" : "edições encontradas"}</span><label>Ordenar <select value={sort} onChange={(event) => setSort(event.target.value as LaunchSort)}><option value="recent">Mais recentes</option><option value="title">A–Z</option><option value="size">Tamanho</option></select></label></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
              {comics.slice(0, visibleCount).map((comic) => <ComicCard key={comic.id} comic={comic} density="compact" onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenDetails={setDetail} onOpenProgressModal={setProgress} onMarkCompleted={(id, total) => setStatus(id, "completed", total)} onResetProgress={(id) => setStatus(id, "not_started", 10)} />)}
            </div>
            {visibleCount < comics.length && <button type="button" className="launches-more" onClick={() => setVisibleCount((count) => count + 48)}>Mostrar mais edições</button>}
          </section>
        </>
      ) : <div className="empty-collection-kind">Ainda não há edições cadastradas no acervo.</div>}

      <ComicDetailModal comic={detail} isOpen={!!detail} onClose={() => setDetail(null)} onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenProgressModal={setProgress} onMarkCompleted={(id, total) => setStatus(id, "completed", total)} onResetProgress={(id) => setStatus(id, "not_started", 10)} />
      <ProgressUpdateModal comic={progress} isOpen={!!progress} onClose={() => setProgress(null)} onSaveProgress={updateProgress} />
    </div>
  );
}
