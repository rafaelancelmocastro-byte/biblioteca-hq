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
          <h2 id="section-recent-comics" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Adicionados recentemente
          </h2>
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
