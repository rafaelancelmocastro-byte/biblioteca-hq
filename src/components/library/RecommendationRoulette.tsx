import React, { useMemo, useRef, useState } from "react";
import { BookOpen, Dices, Heart, Sparkles } from "lucide-react";
import type { Comic } from "../../types/comic";

interface RecommendationRouletteProps {
  comics: Comic[];
  onOpenReader: (comicId: string) => void;
  onOpenDetails: (comic: Comic) => void;
}

function recommendationScore(comic: Comic, signals: Comic[]) {
  if (signals.length === 0) return 1;
  let score = 1;
  for (const signal of signals) {
    if (signal.seriesId === comic.seriesId) score += 5;
    if (signal.publisher === comic.publisher) score += 1;
    score += comic.tags.filter((tag) => signal.tags.includes(tag)).length * 2;
    score += comic.writers.filter((writer) => signal.writers.includes(writer)).length * 1.5;
  }
  if (comic.progress?.status === "completed") score *= 0.25;
  if (comic.progress?.status === "reading") score *= 0.55;
  return score;
}

function weightedPick(comics: Comic[], signals: Comic[], previousId?: string) {
  const pool = comics.filter((comic) => comic.id !== previousId);
  const candidates = pool.length ? pool : comics;
  const weighted = candidates.map((comic) => ({ comic, score: recommendationScore(comic, signals) }));
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

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setRotation((value) => value + 1440 + Math.floor(Math.random() * 720));
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setRecommendation(weightedPick(comics, signals, recommendation.id));
      setSpinning(false);
    }, 1250);
  };

  return (
    <section className="recommendation-roulette" aria-labelledby="roulette-title">
      <div className="roulette-copy">
        <span className="page-kicker"><Sparkles /> Descubra sua próxima leitura</span>
        <h2 id="roulette-title">Gire a roleta do acervo</h2>
        <p>{signals.length ? "A escolha considera suas leituras, favoritos, autores e categorias preferidas." : "A primeira escolha é uma surpresa. Conforme você lê e favorita, as sugestões aprendem suas preferências."}</p>
        <div className="roulette-result" aria-live="polite">
          {recommendation.coverUrl && <img src={recommendation.coverUrl} alt="" />}
          <div><small>{signals.length ? "Recomendado para você" : "Escolha aleatória"}</small><strong>{recommendation.title}</strong><span>{recommendation.seriesTitle} · #{recommendation.issueNumber}</span></div>
        </div>
        <div className="roulette-actions">
          <button className="catalog-primary-action" onClick={spin} disabled={spinning}><Dices /> {spinning ? "Girando..." : "Girar roleta"}</button>
          <button className="catalog-secondary-action" onClick={() => onOpenDetails(recommendation)}>Ver detalhes</button>
          <button className="roulette-read" onClick={() => onOpenReader(recommendation.id)}><BookOpen /> Ler indicação</button>
        </div>
      </div>
      <button className="roulette-wheel" onClick={spin} disabled={spinning} aria-label="Girar roleta de recomendações" style={{ transform: `rotate(${rotation}deg)` }}>
        <span className="roulette-center"><Dices /></span>
        {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ transform: `rotate(${index * 45}deg) translateY(-42%)` }}><Heart /></i>)}
      </button>
    </section>
  );
};
