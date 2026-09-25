import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Heart,
  MoreVertical,
  BookOpen,
  HardDriveDownload,
  X,
} from "lucide-react";
import { Comic } from "../../types/comic";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { ProgressBar } from "../ui/ProgressBar";
import { formatPercentage, getStatusLabel } from "../../lib/formatters";
import { getOfflineIds } from "../../services/offlineLibrary";
import { supabase } from "../../services/supabaseClient";
import { ComicActions } from "./ComicActions";

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
  const [isOffline, setIsOffline] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const percentage = comic.progress?.percentage || 0;
  const status = comic.progress?.status || "not_started";
  const isCompleted = status === "completed";
  const isReading = status === "reading";
  useEffect(() => { let active = true; const check = async () => { const { data } = await supabase!.auth.getSession(); if (data.session) { const ids = await getOfflineIds(data.session.user.id); if (active) setIsOffline(ids.has(comic.id)); } }; if (supabase) void check(); window.addEventListener("biblioteca-offline-changed", check); return () => { active = false; window.removeEventListener("biblioteca-offline-changed", check); }; }, [comic.id]);

  // Fecha menu de contexto ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !portalRef.current?.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsMenuOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    const mobile = window.matchMedia("(max-width: 1024px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (mobile) { document.body.style.overflow = "hidden"; window.requestAnimationFrame(() => portalRef.current?.querySelector<HTMLButtonElement>("button")?.focus()); }
    return () => { document.removeEventListener("keydown", closeOnEscape); if (mobile) document.body.style.overflow = previousOverflow; };
  }, [isMenuOpen]);

  return (
    <>
    <div
      className="comic-tile group relative flex flex-col focus-within:ring-2 focus-within:ring-blue-400/50 rounded-2xl"
      id={`comic-card-${comic.id}`}
    >
      {/* Container da Capa com proporção de HQ */}
      <div className="comic-cover relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 transition-all duration-300 shadow-md">
        {/* Placeholder de Capa Vetorial Elegante */}
        {comic.coverUrl ? (
          <img src={comic.coverUrl} alt={`Capa de ${comic.title}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <CoverPlaceholder
            title={comic.title}
            seriesTitle={comic.seriesTitle}
            issueNumber={comic.issueNumber}
            publisher={comic.publisher}
            coverStyle={comic.coverStyle}
          />
        )}

        {isOffline && (
          <span className="absolute bottom-2 left-2 z-20 inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 backdrop-blur-md">
            <HardDriveDownload className="w-3 h-3" /> Offline
          </span>
        )}

        {/* Botão de Favorito Sobreposto (Canto Superior Direito) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(comic.id);
          }}
          className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
            comic.isFavorite
              ? "bg-rose-500/90 text-white shadow-md shadow-rose-500/30 scale-100"
              : "bg-black/40 text-white/60 hover:text-white hover:bg-black/70 opacity-0 group-hover:opacity-100"
          }`}
          aria-label={comic.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          title={comic.isFavorite ? "Favorito" : "Favoritar"}
        >
          <Heart className={`w-3.5 h-3.5 ${comic.isFavorite ? "fill-current" : ""}`} />
        </button>

        {/* Botão de Menu Contextual (Canto Superior Esquerdo) */}
        <div className="absolute top-2 left-2 z-20" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            aria-label="Opções da HQ"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && <div className="comic-action-desktop" onClick={(event) => event.stopPropagation()}><ComicActions comic={comic} onClose={() => setIsMenuOpen(false)} onOpenReader={onOpenReader} onOpenDetails={onOpenDetails} onOpenProgressModal={onOpenProgressModal} onMarkCompleted={onMarkCompleted} onResetProgress={onResetProgress} /></div>}
        </div>

        {/* Hover Action Overlay: Botão rápido para Ler estilo Apple TV */}
        <div
          onClick={() => onOpenReader(comic.id)}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2.5 z-10 cursor-pointer p-4 backdrop-blur-[2px]"
        >
          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <BookOpen className="w-5 h-5 ml-0.5" />
          </div>
          <span className="text-xs font-semibold text-white bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
            {isReading ? "Retomar" : isCompleted ? "Reler" : "Ler Agora"}
          </span>
        </div>

        {/* Barra de Progresso no pé da Capa */}
        {percentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-15 bg-black/85 backdrop-blur-xs px-2.5 py-1.5 border-t border-white/10">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
              <span className="truncate">
                Pág. {comic.progress?.currentPage || 0}/{Math.max(comic.totalPages, comic.progress?.totalPages || 0, comic.progress?.currentPage || 0)}
              </span>
              <span className={isCompleted ? "text-emerald-400 font-semibold" : "text-blue-400 font-semibold"}>
                {formatPercentage(percentage)}
              </span>
            </div>
            <ProgressBar percentage={percentage} status={status} size="sm" />
          </div>
        )}
      </div>

      {/* Metadados e Título Abaixo da Capa (Zero-Pill) */}
      <div className="pt-2 px-0.5 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-0.5">
          <span className="font-semibold text-neutral-300 truncate">{comic.seriesTitle}</span>
          <span className="text-neutral-600">·</span>
          <span className="shrink-0 text-neutral-400">#{comic.issueNumber}</span>
        </div>

        <button
          onClick={() => onOpenDetails(comic)}
          className="text-left text-xs font-semibold text-white hover:text-blue-300 transition-colors line-clamp-1 leading-snug cursor-pointer"
          title={comic.title}
        >
          {comic.title}
        </button>

        {density === "comfortable" && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span>{comic.year}</span>
            <span className="text-neutral-600">·</span>
            <span className="truncate text-neutral-400">
              {comic.publisher}
            </span>
          </div>
        )}
      </div>
    </div>
    {isMenuOpen && createPortal(<div className="comic-action-backdrop" onClick={() => setIsMenuOpen(false)}><div className="comic-action-sheet" ref={portalRef} role="dialog" aria-modal="true" aria-label={`Ações de ${comic.title}`} onClick={(event) => event.stopPropagation()}><div className="comic-action-sheet-header"><div><small>Opções da HQ</small><strong>{comic.title}</strong></div><button type="button" aria-label="Fechar menu" onClick={() => setIsMenuOpen(false)}><X /></button></div><ComicActions comic={comic} onClose={() => setIsMenuOpen(false)} onOpenReader={onOpenReader} onOpenDetails={onOpenDetails} onOpenProgressModal={onOpenProgressModal} onMarkCompleted={onMarkCompleted} onResetProgress={onResetProgress} /></div></div>, document.body)}
    </>
  );
};
