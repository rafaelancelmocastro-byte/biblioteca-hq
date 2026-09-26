import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, BookOpen } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import type { Comic } from "../../types/comic";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";

type IndieType = "all" | "graphic_novel" | "manga" | "manhwa";
type IndieSort = "recent" | "title" | "year";

const labels: Record<IndieType, string> = {
  all: "Todos",
  graphic_novel: "Graphic novels",
  manga: "Mangás",
  manhwa: "Manhwas",
};

const addedTime = (comic: Comic) => new Date(comic.addedAt).getTime() || 0;

export const IndieMangaPage: React.FC<{ onOpenReader: (id: string) => void }> = ({ onOpenReader }) => {
  const { allComics, toggleFavorite, updateProgress, setStatus, isLoading } = useLibrary();
  const [type, setType] = useState<IndieType>("all");
  const [sort, setSort] = useState<IndieSort>("recent");
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Comic | null>(null);
  const [progress, setProgress] = useState<Comic | null>(null);

  const eligibleBooks = useMemo(
    () =>
      allComics.filter(
        (comic) =>
          ["graphic_novel", "manga", "manhwa"].includes(comic.contentType || "") ||
          /image|dark horse|vertigo|independente|indie/i.test(comic.publisher)
      ),
    [allComics]
  );

  const filteredBooks = useMemo(
    () => eligibleBooks.filter((comic) => type === "all" || comic.contentType === type),
    [eligibleBooks, type]
  );

  const books = useMemo(() => {
    const list = [...filteredBooks];
    if (sort === "title") return list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR") || a.issueNumber - b.issueNumber);
    if (sort === "year") return list.sort((a, b) => b.year - a.year || addedTime(b) - addedTime(a));
    return list.sort((a, b) => addedTime(b) - addedTime(a) || b.year - a.year || a.title.localeCompare(b.title, "pt-BR"));
  }, [filteredBooks, sort]);

  const featured = useMemo(
    () => [...filteredBooks].sort((a, b) => addedTime(b) - addedTime(a) || b.year - a.year).slice(0, 8),
    [filteredBooks]
  );
  const selected = featured[Math.min(active, Math.max(0, featured.length - 1))];

  useEffect(() => {
    setActive(0);
    setSort("recent");
  }, [type]);

  return (
    <div className="streaming-page indie-page space-y-10 sm:space-y-12">
      <header className="px-1 pt-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Multiverso</span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Mangá & Indie</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
          Mangás, manhwas, graphic novels e quadrinhos independentes reunidos em uma seleção editorial do acervo.
        </p>
      </header>

      {selected && (
        <section className="relative overflow-hidden pt-1 pb-4" aria-label="Destaques de Mangá e Indie">
          {selected.coverUrl && (
            <div className="absolute inset-0 -z-10 overflow-hidden opacity-20 blur-3xl pointer-events-none">
              <img
                src={selected.coverUrl}
                alt=""
                className="h-full w-full -translate-y-1/4 scale-150 object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#05090f]/50 via-[#05090f]/80 to-[#05090f]" />
            </div>
          )}

          <div className="mx-auto w-full max-w-4xl px-2">
            <CoverFlow
              items={featured.map((comic) => ({
                id: comic.id,
                title: comic.title,
                image: comic.coverUrl,
                subtitle: `${comic.seriesTitle || comic.publisher} · #${comic.issueNumber}`,
              }))}
              activeIndex={active}
              onChange={setActive}
              onActivate={(item) => setDetail(featured.find((comic) => comic.id === item.id) || null)}
              label="Obras em destaque"
            />
          </div>

          <div className="mx-auto mt-5 max-w-xl px-4 text-center">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {selected.seriesTitle || selected.publisher} · #{selected.issueNumber}
            </span>
            <h2 className="break-words text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {selected.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-neutral-400 sm:text-sm">
              <span>{selected.year}</span>
              <span>·</span>
              <span className="min-w-0 break-words">{selected.publisher}</span>
              <span>·</span>
              <span>{selected.totalPages} páginas</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onOpenReader(selected.id)}
                className="flex h-11 max-w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-semibold text-black shadow-lg transition-colors hover:bg-neutral-200 sm:px-7 sm:text-sm"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>{(selected.progress?.currentPage || 0) > 0 || (selected.progress?.percentage || 0) > 0 ? "Retomar" : "Ler agora"}</span>
              </button>
              <button
                type="button"
                onClick={() => setDetail(selected)}
                className="h-11 rounded-full border border-white/15 bg-white/5 px-5 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:text-sm"
              >
                Detalhes
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-2 backdrop-blur-md sm:p-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.05] p-1 sm:grid-cols-4" role="tablist" aria-label="Filtrar formato">
          {(Object.keys(labels) as IndieType[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={type === value}
              onClick={() => setType(value)}
              className={`min-h-9 min-w-0 rounded-lg px-2 text-[11px] font-semibold leading-tight transition-all sm:px-3 sm:text-xs ${type === value ? "bg-white font-bold text-black shadow-md" : "text-neutral-400 hover:text-neutral-200"}`}
            >
              {labels[value]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="empty-collection-kind" role="status">Carregando obras...</div>
      ) : books.length ? (
        <section className="space-y-4" aria-labelledby="indie-catalog-title">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 id="indie-catalog-title" className="text-xl font-bold tracking-tight text-white sm:text-2xl">{labels[type]}</h2>
                <span className="text-xs text-neutral-400 sm:text-sm">· {books.length} {books.length === 1 ? "obra" : "obras"}</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
                {type === "all" ? "Seleção completa de mangás, manhwas, graphic novels e quadrinhos independentes." : `Obras classificadas como ${labels[type].toLowerCase()}.`}
              </p>
            </div>

            <label className="flex w-full items-center gap-2 text-xs font-medium text-neutral-400 sm:w-auto">
              <span className="flex shrink-0 items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5" /> Ordenar</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as IndieSort)}
                aria-label="Critério de ordenação"
                className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-neutral-900/90 px-3 text-xs text-white outline-none transition-colors focus:border-white/30 sm:w-44 sm:flex-none"
              >
                <option value="recent">Mais recentes</option>
                <option value="title">Título A–Z</option>
                <option value="year">Ano mais recente</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {books.map((comic) => (
              <ComicCard
                key={comic.id}
                comic={comic}
                density="compact"
                onOpenReader={onOpenReader}
                onToggleFavorite={toggleFavorite}
                onOpenDetails={setDetail}
                onOpenProgressModal={setProgress}
                onMarkCompleted={(id, total) => setStatus(id, "completed", total)}
                onResetProgress={(id) => setStatus(id, "not_started", 10)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-collection-kind">
          <BookOpen />
          <h2>Nenhuma obra nesta categoria</h2>
          <p>Novas publicações aparecerão aqui quando forem adicionadas ao acervo.</p>
        </div>
      )}

      <ComicDetailModal
        comic={detail}
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        onOpenReader={onOpenReader}
        onToggleFavorite={toggleFavorite}
        onOpenProgressModal={(comic) => { setDetail(null); setProgress(comic); }}
        onMarkCompleted={(id, total) => { setStatus(id, "completed", total); setDetail(null); }}
        onResetProgress={(id) => { setStatus(id, "not_started", 10); setDetail(null); }}
      />
      <ProgressUpdateModal comic={progress} isOpen={!!progress} onClose={() => setProgress(null)} onSaveProgress={updateProgress} />
    </div>
  );
};
