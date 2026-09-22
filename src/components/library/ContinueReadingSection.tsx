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
    <section className="mb-10" aria-labelledby="section-continue-reading">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <h2 id="section-continue-reading" className="text-lg font-bold text-white tracking-tight">
            Continuar Lendo
          </h2>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full font-mono">
            {comics.length} em andamento
          </span>
        </div>
        {canScroll && <div className="hidden md:flex gap-2">
          <button type="button" className="reading-rail-arrow" aria-label="Ver leituras anteriores" onClick={() => railRef.current?.scrollBy({ left: -380, behavior: "smooth" })}><ChevronLeft /></button>
          <button type="button" className="reading-rail-arrow" aria-label="Ver próximas leituras" onClick={() => railRef.current?.scrollBy({ left: 380, behavior: "smooth" })}><ChevronRight /></button>
        </div>}
      </div>

      {/* Grid de Cards Horizontais Estilo Streaming */}
      <div ref={railRef} className="reading-rail" tabIndex={0} aria-label="Leituras em andamento; use as setas para navegar" onKeyDown={(event) => { if (event.key === "ArrowRight") railRef.current?.scrollBy({ left: 380, behavior: "smooth" }); if (event.key === "ArrowLeft") railRef.current?.scrollBy({ left: -380, behavior: "smooth" }); }}>
        {comics.map((comic) => {
          const currentPage = comic.progress?.currentPage || 1;
          const totalPages = Math.max(comic.totalPages, comic.progress?.totalPages || 0, currentPage);
          const percentage = comic.progress?.percentage || Math.round((currentPage / totalPages) * 100);

          return (
            <div
              key={comic.id}
              className="reading-rail-card group relative flex bg-[#131722] hover:bg-[#181e2b] border border-[#1e2535] hover:border-slate-700/80 rounded-xl p-3 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-black/40 overflow-hidden"
            >
              {/* Capa Compacta à Esquerda */}
              <div
                onClick={() => onOpenReader(comic.id)}
                className="w-20 sm:w-24 flex-shrink-0 cursor-pointer rounded-lg overflow-hidden relative group/cover shadow-md"
              >
                {comic.coverUrl ? (
                  <img src={comic.coverUrl} alt={`Capa de ${comic.title}`} className="h-full w-full object-cover" loading="lazy" />
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
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-6 h-6 text-amber-400 fill-amber-400" />
                </div>
              </div>

              {/* Informações à Direita */}
              <div className="flex-1 min-w-0 ml-3.5 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-center justify-between gap-1 text-[11px] text-amber-400 font-semibold mb-0.5">
                    <span className="truncate">{comic.seriesTitle}</span>
                    <span className="font-mono text-slate-400">Ed. #{comic.issueNumber}</span>
                  </div>

                  <h3
                    onClick={() => onOpenDetails(comic)}
                    className="text-xs sm:text-sm font-bold text-white hover:text-amber-400 cursor-pointer line-clamp-1 transition-colors leading-tight"
                    title={comic.title}
                  >
                    {comic.title}
                  </h3>

                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                    <span>Página {currentPage} de {totalPages}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400 font-semibold">{formatPercentage(percentage)}</span>
                  </p>
                </div>

                <div className="mt-3">
                  <ProgressBar percentage={percentage} size="sm" className="mb-2" />

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-slate-400 truncate">
                      Lido {formatRelativeDate(comic.progress?.lastReadAt)}
                    </span>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onOpenReader(comic.id)}
                      className="h-7 text-xs font-bold px-2.5 py-0"
                    >
                      <Play className="w-3 h-3 fill-current mr-1" />
                      Continuar
                    </Button>
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
