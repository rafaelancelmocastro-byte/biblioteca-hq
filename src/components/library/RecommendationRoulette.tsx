import React, { useMemo, useRef, useState } from "react";
import { BookOpen, Dices } from "lucide-react";
import type { Comic } from "../../types/comic";
import { readingInsights } from "../../lib/readingInsights";

interface RecommendationRouletteProps {
  comics: Comic[];
  onOpenReader: (comicId: string) => void;
  onOpenDetails: (comic: Comic) => void;
}

function recommendationScore(comic: Comic, signals: Comic[], favoriteCharacters: string[], favoritePublishers: string[]) {
  if (signals.length === 0) return 1;
  let score = 1;
  for (const signal of signals) {
    if (signal.seriesId === comic.seriesId) score += 5;
    if (signal.publisher === comic.publisher) score += 1;
    score += comic.tags.filter((tag) => signal.tags.includes(tag)).length * 2;
    score += comic.writers.filter((writer) => signal.writers.includes(writer)).length * 1.5;
  }
  if (favoritePublishers.includes(comic.publisher)) score += 2;
  score += comic.characters.filter((character) => favoriteCharacters.includes(character)).length * 2;
  if (comic.progress?.status === "completed") score *= 0.25;
  if (comic.progress?.status === "reading") score *= 0.55;
  return score;
}

function weightedPick(comics: Comic[], signals: Comic[], favoriteCharacters: string[], favoritePublishers: string[], previousId?: string) {
  const pool = comics.filter((comic) => comic.id !== previousId);
  const candidates = pool.length ? pool : comics;
  const weighted = candidates.map((comic) => ({ comic, score: recommendationScore(comic, signals, favoriteCharacters, favoritePublishers) }));
  const total = weighted.reduce((sum, item) => sum + item.score, 0);
  let cursor = Math.random() * total;
  for (const item of weighted) {
    cursor -= item.score;
    if (cursor <= 0) return item.comic;
  }
  return weighted.at(-1)?.comic;
}

export const RecommendationRoulette: React.FC<RecommendationRouletteProps> = ({ comics, onOpenReader, onOpenDetails }) => {
  const signals = useMemo(() => comics.filter((comic) => comic.isFavorite || comic.progress?.status === "reading" || comic.progress?.status === "completed"), [comics]);
  const insights = useMemo(() => readingInsights(comics), [comics]);
  const initial = useMemo(() => comics[Math.floor(Math.random() * Math.max(comics.length, 1))], [comics]);
  const [recommendation, setRecommendation] = useState<Comic | undefined>(initial);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef<number | null>(null);

  React.useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  React.useEffect(() => {
    if (!recommendation && comics.length > 0) setRecommendation(comics[Math.floor(Math.random() * comics.length)]);
  }, [comics, recommendation]);

  if (!recommendation || comics.length === 0) return null;

  const pickNext = () => {
    if (spinning) return;
    setSpinning(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setRecommendation(weightedPick(comics, signals, insights.favoriteCharacters, insights.favoritePublishers, recommendation.id));
      setSpinning(false);
    }, 200);
  };

  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md" aria-labelledby="recommendation-card-title">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          {recommendation.coverUrl ? (
            <img
              src={recommendation.coverUrl}
              alt=""
              className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-xl shadow-md border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-16 sm:w-20 aspect-[2/3] rounded-xl bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 shrink-0">
              HQ
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Não sabe o que ler?
            </span>
            <h3 id="recommendation-card-title" className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {recommendation.title}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 truncate">
              {recommendation.seriesTitle} · #{recommendation.issueNumber} · {recommendation.publisher} ({recommendation.year})
            </p>
            {recommendation.synopsis && (
              <p className="text-xs text-neutral-400 line-clamp-2 mt-1.5 max-w-xl">
                {recommendation.synopsis}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={() => onOpenReader(recommendation.id)}
            className="flex-1 md:flex-none h-10 px-5 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ler agora</span>
          </button>

          <button
            onClick={pickNext}
            disabled={spinning}
            className="h-10 px-4 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Dices className={`w-3.5 h-3.5 text-neutral-400 ${spinning ? "animate-spin" : ""}`} />
            <span>Sugerir outra</span>
          </button>

          <button
            onClick={() => onOpenDetails(recommendation)}
            className="h-10 px-3.5 rounded-full text-neutral-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Detalhes
          </button>
        </div>
      </div>
    </section>
  );
};
