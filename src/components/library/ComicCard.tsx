import React, { useState, useRef, useEffect } from "react";
import {
  Heart,
  MoreVertical,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Info,
} from "lucide-react";
import { Comic } from "../../types/comic";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { ProgressBar } from "../ui/ProgressBar";
import { formatPercentage, getStatusLabel } from "../../lib/formatters";

interface ComicCardProps {
  comic: Comic;
  onOpenReader: (comicId: string) => void;
  onToggleFavorite: (comicId: string) => void;
  onOpenDetails: (comic: Comic) => void;
  onOpenProgressModal: (comic: Comic) => void;
  onMarkCompleted: (comicId: string, totalPages: number) => void;
  onResetProgress: (comicId: string) => void;
  density?: "compact" | "comfortable";
}

export const ComicCard: React.FC<ComicCardProps> = ({
  comic,
  onOpenReader,
  onToggleFavorite,
  onOpenDetails,
  onOpenProgressModal,
  onMarkCompleted,
  onResetProgress,
  density = "comfortable",
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const percentage = comic.progress?.percentage || 0;
  const status = comic.progress?.status || "not_started";
  const isCompleted = status === "completed";
  const isReading = status === "reading";

  // Fecha menu de contexto ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div
      className="comic-tile group relative flex flex-col focus-within:ring-2 focus-within:ring-[#d6653e] rounded-2xl"
      id={`comic-card-${comic.id}`}
    >
      {/* Container da Capa com proporção de HQ */}
      <div className="comic-cover relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#171310] border border-white/8 transition-all duration-300 shadow-md group-hover:-translate-y-1.5">
        {/* Placeholder de Capa Vetorial Elegante */}
        {comic.coverUrl ? (
          <img src={comic.coverUrl} alt={`Capa de ${comic.title}`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <CoverPlaceholder
            title={comic.title}
            seriesTitle={comic.seriesTitle}
            issueNumber={comic.issueNumber}
            publisher={comic.publisher}
            coverStyle={comic.coverStyle}
          />
        )}

        {/* Botão de Favorito Sobreposto (Canto Superior Direito) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(comic.id);
          }}
          className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
            comic.isFavorite
              ? "bg-rose-500/90 text-white shadow-md shadow-rose-500/30 scale-105"
              : "bg-black/50 text-white/70 hover:text-white hover:bg-black/80 hover:scale-105"
          }`}
          aria-label={comic.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          title={comic.isFavorite ? "Favorito" : "Favoritar"}
        >
          <Heart
            className={`w-4 h-4 ${comic.isFavorite ? "fill-current" : ""}`}
          />
        </button>

        {/* Botão de Menu Contextual (Canto Superior Esquerdo) */}
        <div className="absolute top-2 left-2 z-20" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
            aria-label="Opções da HQ"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Menu Dropdown Flutuante */}
          {isMenuOpen && (
            <div
              className="absolute left-0 mt-1 w-48 rounded-xl bg-[#141824] border border-slate-700/80 shadow-2xl shadow-black/90 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenReader(comic.id);
                }}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-slate-200 hover:bg-slate-800/80 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>{percentage > 0 ? "Continuar lendo" : "Começar leitura"}</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenDetails(comic);
                }}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-slate-200 hover:bg-slate-800/80 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Ver detalhes</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenProgressModal(comic);
                }}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-slate-200 hover:bg-slate-800/80 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Ajustar progresso</span>
              </button>

              <div className="my-1 border-t border-slate-800/80" />

              {!isCompleted ? (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onMarkCompleted(comic.id, comic.totalPages);
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-emerald-400 hover:bg-slate-800/80 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marcar como lida</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onResetProgress(comic.id);
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar leitura</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Hover Action Overlay: Botão rápido para Ler */}
        <div
          onClick={() => onOpenReader(comic.id)}
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10 cursor-pointer p-4 backdrop-blur-[2px]"
        >
          <div className="w-12 h-12 rounded-full bg-[#d95e32] text-white flex items-center justify-center font-bold shadow-lg shadow-[#d95e32]/30 transform scale-90 group-hover:scale-100 transition-transform">
            <BookOpen className="w-6 h-6 ml-0.5" />
          </div>
          <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full border border-white/20">
            {isReading ? "Retomar" : isCompleted ? "Reler" : "Ler Agora"}
          </span>
        </div>

        {/* Barra de Progresso no pé da Capa */}
        {percentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-15 bg-black/80 backdrop-blur-xs px-2.5 py-1.5 border-t border-white/10">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 mb-1">
              <span className="truncate">
                Pág. {comic.progress?.currentPage || 0}/{comic.totalPages}
              </span>
              <span className={isCompleted ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                {formatPercentage(percentage)}
              </span>
            </div>
            <ProgressBar percentage={percentage} status={status} size="sm" />
          </div>
        )}
      </div>

      {/* Metadados e Título Abaixo da Capa */}
      <div className="pt-2 px-0.5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 mb-0.5">
          <span className="font-semibold text-amber-500/90 truncate">{comic.seriesTitle}</span>
          <span className="text-[10px] text-slate-400 font-mono shrink-0">#{comic.issueNumber}</span>
        </div>

        <button
          onClick={() => onOpenDetails(comic)}
          className="text-left text-xs font-semibold text-slate-100 hover:text-amber-400 transition-colors line-clamp-1 leading-snug cursor-pointer"
          title={comic.title}
        >
          {comic.title}
        </button>

        {density === "comfortable" && (
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>{comic.year}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
              {comic.publisher}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
