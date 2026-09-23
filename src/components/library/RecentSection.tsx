import React from "react";
import { Sparkles } from "lucide-react";
import { Comic } from "../../types/comic";
import { ComicCard } from "./ComicCard";

interface RecentSectionProps {
  comics: Comic[];
  onOpenReader: (comicId: string) => void;
  onToggleFavorite: (comicId: string) => void;
  onOpenDetails: (comic: Comic) => void;
  onOpenProgressModal: (comic: Comic) => void;
  onMarkCompleted: (comicId: string, totalPages: number) => void;
  onResetProgress: (comicId: string) => void;
}

export const RecentSection: React.FC<RecentSectionProps> = ({
  comics,
  onOpenReader,
  onToggleFavorite,
  onOpenDetails,
  onOpenProgressModal,
  onMarkCompleted,
  onResetProgress,
}) => {
  if (comics.length === 0) return null;

  return (
    <section className="mb-10 streaming-section" aria-labelledby="section-recent-comics">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#7896b8]" />
          <h2 id="section-recent-comics" className="streaming-heading">
            Novidades no acervo
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Últimas aquisições do acervo
          </span>
        </div>
      </div>

      {/* Grid horizontal responsivo */}
      <div className="streaming-rail">
        {comics.map((comic) => (
          <ComicCard
            key={comic.id}
            comic={comic}
            onOpenReader={onOpenReader}
            onToggleFavorite={onToggleFavorite}
            onOpenDetails={onOpenDetails}
            onOpenProgressModal={onOpenProgressModal}
            onMarkCompleted={onMarkCompleted}
            onResetProgress={onResetProgress}
            density="compact"
          />
        ))}
      </div>
    </section>
  );
};
