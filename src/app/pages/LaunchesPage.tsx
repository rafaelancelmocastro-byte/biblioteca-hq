import { useMemo, useState } from "react";
import { BookOpen, Info, Sparkles } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { CoverFlow } from "../../components/library/CoverFlow";
import { ComicCard } from "../../components/library/ComicCard";
import { ComicDetailModal } from "../../components/library/ComicDetailModal";
import { ProgressUpdateModal } from "../../components/library/ProgressUpdateModal";
import type { Comic } from "../../types/comic";

export function LaunchesPage({ onOpenReader }: { onOpenReader: (id: string) => void }) {
  const { allComics, toggleFavorite, updateProgress, setStatus, isLoading } = useLibrary();
  const comics = useMemo(() => allComics.filter((comic) => comic.year === 2026), [allComics]);
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Comic | null>(null);
  const [progress, setProgress] = useState<Comic | null>(null);
  const featured = comics.slice(0, 8);
  const selected = featured[Math.min(active, featured.length - 1)];

  return (
    <div className="streaming-page launches-page space-y-8 sm:space-y-10">
      <header className="page-spotlight launches-spotlight">
        <span className="page-kicker"><Sparkles /> Novidades do acervo</span>
        <h1>Edições de 2026</h1>
        <p>Descubra as histórias publicadas neste ano e escolha sua próxima leitura.</p>
        {!isLoading && <span className="launches-total">{comics.length} {comics.length === 1 ? "edição disponível" : "edições disponíveis"}</span>}
      </header>

      {isLoading ? (
        <div className="empty-collection-kind" role="status">Carregando edições...</div>
      ) : comics.length ? (
        <>
          <section className="collection-hub launches-feature" aria-label="Destaques de 2026">
            <div className="launches-section-label"><Sparkles aria-hidden="true" /> Em destaque</div>
            <CoverFlow
              items={featured.map((comic) => ({
                id: comic.id,
                title: comic.title,
                subtitle: `${comic.publisher} · ${comic.totalPages} páginas`,
                image: comic.coverUrl,
              }))}
              activeIndex={active}
              onChange={setActive}
              onActivate={(item) => setDetail(comics.find((comic) => comic.id === item.id) || null)}
              label="Destaques de 2026"
            />
            {selected && (
              <div className="collection-hub-info launches-feature-info">
                <div>
                  <span>{selected.publisher} · 2026</span>
                  <h2>{selected.title}</h2>
                  <p>{selected.synopsis || `${selected.totalPages} páginas para descobrir nesta edição.`}</p>
                </div>
                <div className="launches-feature-actions">
                  <button type="button" className="catalog-primary-action" onClick={() => onOpenReader(selected.id)}><BookOpen /> Ler agora</button>
                  <button type="button" className="catalog-secondary-action" onClick={() => setDetail(selected)}><Info /> Detalhes</button>
                </div>
              </div>
            )}
          </section>

          <section className="streaming-section" aria-labelledby="launches-all-title">
            <div className="launches-list-heading">
              <div>
                <span className="launches-section-label"><Sparkles aria-hidden="true" /> Acervo de 2026</span>
                <h2 id="launches-all-title" className="streaming-heading">Todas as edições</h2>
                <p>Explore as histórias disponíveis deste ano.</p>
              </div>
              <span>{comics.length} {comics.length === 1 ? "título" : "títulos"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
              {comics.map((comic) => (
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
        </>
      ) : (
        <div className="empty-collection-kind">Ainda não há edições de 2026 cadastradas.</div>
      )}

      <ComicDetailModal comic={detail} isOpen={!!detail} onClose={() => setDetail(null)} onOpenReader={onOpenReader} onToggleFavorite={toggleFavorite} onOpenProgressModal={setProgress} onMarkCompleted={(id, total) => setStatus(id, "completed", total)} onResetProgress={(id) => setStatus(id, "not_started", 10)} />
      <ProgressUpdateModal comic={progress} isOpen={!!progress} onClose={() => setProgress(null)} onSaveProgress={updateProgress} />
    </div>
  );
}
