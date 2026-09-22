import React from "react";
import { BookX, RotateCcw } from "lucide-react";
import { Comic } from "../../types/comic";
import { ComicCard } from "./ComicCard";
import { Button } from "../ui/Button";

interface LibraryGridProps {
  comics: Comic[];
  onOpenReader: (comicId: string) => void;
  onToggleFavorite: (comicId: string) => void;
  onOpenDetails: (comic: Comic) => void;
  onOpenProgressModal: (comic: Comic) => void;
  onMarkCompleted: (comicId: string, totalPages: number) => void;
  onResetProgress: (comicId: string) => void;
  density: "compact" | "comfortable";
  onResetFilters?: () => void;
  title?: string;
}

export const LibraryGrid: React.FC<LibraryGridProps> = ({
  comics,
  onOpenReader,
  onToggleFavorite,
  onOpenDetails,
  onOpenProgressModal,
  onMarkCompleted,
  onResetProgress,
  density,
  onResetFilters,
  title = "Toda a Biblioteca",
}) => {
  if (comics.length === 0) {
    return (
      <div className="py-16 px-4 text-center bg-[#131722]/50 border border-[#1e2535] rounded-2xl my-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
          <BookX className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Nenhum quadrinho encontrado</h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
          Nenhuma HQ corresponde aos termos ou filtros selecionados. Tente ajustar os parâmetros de busca.
        </p>
        {onResetFilters && (
          <Button variant="secondary" size="sm" onClick={onResetFilters} className="mx-auto">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Redefinir filtros
          </Button>
        )}
      </div>
    );
  }

  // Definição das classes de grid com base na densidade e breakpoints
  const gridClasses =
    density === "compact"
      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4"
      : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5";

  return (
    <section aria-label={title}>
      <div className={gridClasses}>
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
            density={density}
          />
        ))}
      </div>
    </section>
  );
};
