import React, { useEffect, useRef, useState } from "react";
import { Play, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Comic } from "../../types/comic";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { ProgressBar } from "../ui/ProgressBar";
import { formatPercentage, formatRelativeDate } from "../../lib/formatters";
import { Button } from "../ui/Button";

interface ContinueReadingSectionProps {
  comics: Comic[];
  onOpenReader: (comicId: string) => void;
  onOpenDetails: (comic: Comic) => void;
}

export const ContinueReadingSection: React.FC<ContinueReadingSectionProps> = ({
  comics,
  onOpenReader,
  onOpenDetails,
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => setCanScroll(rail.scrollWidth > rail.clientWidth + 4);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [comics.length]);
  if (comics.length === 0) return null;

  return (
    <section className="mb-12" aria-labelledby="section-continue-reading">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <h2 id="section-continue-reading" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Continuar lendo
          </h2>
          <span className="text-sm text-neutral-400 font-normal">
            · {comics.length}
          </span>
        </div>
        {canScroll && (
          <div className="hidden md:flex gap-1.5">
            <button
              type="button"
              className="w-8 h-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Ver leituras anteriores"
              onClick={() => railRef.current?.scrollBy({ left: -380, behavior: "smooth" })}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Ver próximas leituras"
              onClick={() => railRef.current?.scrollBy({ left: 380, behavior: "smooth" })}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid de Cards Horizontais Estilo Apple TV+ */}
      <div
        ref={railRef}
        className="reading-rail"
        tabIndex={0}
        aria-label="Leituras em andamento; use as setas para navegar"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") railRef.current?.scrollBy({ left: 380, behavior: "smooth" });
          if (event.key === "ArrowLeft") railRef.current?.scrollBy({ left: -380, behavior: "smooth" });
        }}
      >
        {comics.map((comic) => {
          const currentPage = comic.progress?.currentPage || 1;
          const totalPages = Math.max(comic.totalPages, comic.progress?.totalPages || 0, currentPage);
          const percentage = comic.progress?.percentage || Math.round((currentPage / totalPages) * 100);

          return (
            <div
              key={comic.id}
              className="reading-rail-card group relative flex bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 rounded-2xl p-3.5 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-black/60 overflow-hidden"
            >
              {/* Capa Compacta à Esquerda */}
              <div
                onClick={() => onOpenReader(comic.id)}
                className="w-20 sm:w-22 aspect-[2/3] flex-shrink-0 cursor-pointer rounded-xl overflow-hidden relative group/cover shadow-md bg-neutral-900 border border-white/10"
              >
                {comic.coverUrl ? (
                  <img src={comic.coverUrl} alt={`Capa de ${comic.title}`} className="h-full w-full object-cover transition-transform duration-300 group-hover/cover:scale-105" loading="lazy" />
                ) : (
                  <CoverPlaceholder
                    title={comic.title}
                    seriesTitle={comic.seriesTitle}
                    issueNumber={comic.issueNumber}
                    publisher={comic.publisher}
                    coverStyle={comic.coverStyle}
                    showSpine={false}
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Informações à Direita */}
              <div className="flex-1 min-w-0 ml-3.5 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-center gap-1.5 text-[12px] text-neutral-400 font-medium mb-1">
                    <span className="truncate">{comic.seriesTitle}</span>
                    <span className="text-neutral-500 font-normal">·</span>
                    <span className="text-neutral-400">#{comic.issueNumber}</span>
                  </div>

                  <h3
                    onClick={() => onOpenDetails(comic)}
                    className="text-sm font-semibold text-white hover:text-neutral-200 cursor-pointer line-clamp-1 transition-colors leading-snug"
                    title={comic.title}
                  >
                    {comic.title}
                  </h3>

                  <p className="text-[12px] text-neutral-400 mt-1 flex items-center gap-1.5">
                    <span>Pág. {currentPage}/{totalPages}</span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-neutral-200 font-medium">{formatPercentage(percentage)}</span>
                  </p>
                </div>

                <div className="mt-3">
                  <ProgressBar percentage={percentage} size="sm" className="mb-2" />

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-neutral-400 truncate">
                      {comic.progress?.lastReadAt ? `Lido ${formatRelativeDate(comic.progress.lastReadAt)}` : "Em andamento"}
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenReader(comic.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Continuar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
