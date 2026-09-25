import React, { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Compass, Search } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import type { Comic } from "../../types/comic";
import { matchesComicSearch } from "../../lib/librarySearch";

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const orderIssues = (a: Comic, b: Comic) => (a.volume || 0) - (b.volume || 0) || a.issueNumber - b.issueNumber || a.year - b.year;

export const ReadingGuidePage: React.FC<{ onOpenReader: (id: string) => void }> = ({ onOpenReader }) => {
  const { allComics, seriesList, isLoading } = useLibrary();
  const [query, setQuery] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const needle = fold(query.trim());
  const paths = useMemo(() => seriesList.map((series) => {
    const issues = allComics.filter((comic) => comic.seriesId === series.id).sort(orderIssues);
    return { series, issues, next: issues.find((comic) => comic.progress?.status !== "completed") || issues[0] };
  }).filter((path) => path.issues.length).sort((a, b) => a.series.title.localeCompare(b.series.title, "pt-BR")), [allComics, seriesList]);
  const filteredPaths = paths.filter((path) => !needle || [path.series.title, path.series.publisher].some((value) => fold(value).includes(needle)) || path.issues.some((comic) => matchesComicSearch(comic, query)))
    .sort((a, b) => Number(fold(b.series.title).includes(needle)) - Number(fold(a.series.title).includes(needle)) || a.series.title.localeCompare(b.series.title, "pt-BR"));
  const selected = paths.find((path) => path.series.id === selectedSeriesId) || filteredPaths[0];
  const related = selected ? paths.filter((path) => path.series.id !== selected.series.id && (path.series.id === selected.series.parentSeriesId || path.series.parentSeriesId === selected.series.id || (!!selected.series.parentSeriesId && path.series.parentSeriesId === selected.series.parentSeriesId))) : [];

  return (
    <div className="streaming-page reading-guide-page">
      <header className="page-spotlight guide-spotlight">
        <span className="page-kicker"><Compass /> Guia de leitura</span>
        <h1>Por onde começar?</h1>
        <p>Encontre uma coleção, veja a sequência das edições e escolha o caminho que faz sentido para você.</p>
      </header>

      <section className="guide-search-panel" aria-label="Encontrar caminho de leitura">
        <div>
          <label htmlFor="guide-search"><Search /> O que você quer ler?</label>
          {!isLoading && <span className="guide-path-count">{filteredPaths.length} {filteredPaths.length === 1 ? "caminho" : "caminhos"}</span>}
        </div>
        <input id="guide-search" type="search" placeholder="Ex.: Superman, X-Men, Action Comics..." value={query} onChange={(event) => { setQuery(event.target.value); setSelectedSeriesId(null); }} />
        <p>As edições seguem a ordem editorial. O ano de publicação não define a cronologia da história, e as conexões são sugestões de leitura.</p>
      </section>

      {isLoading ? (
        <p className="guide-empty" role="status">Carregando caminhos de leitura...</p>
      ) : !filteredPaths.length && !selectedSeriesId ? (
        <p className="guide-empty">Não encontramos uma trilha para essa busca. Tente o nome da coleção, personagem ou editora.</p>
      ) : (
        <div className="guide-layout">
          <section className="guide-paths-panel" aria-labelledby="guide-paths-title">
            <div className="guide-column-heading">
              <span className="launches-section-label"><Compass aria-hidden="true" /> Explore</span>
              <h2 id="guide-paths-title" className="streaming-heading">Caminhos de leitura</h2>
            </div>
            <div className="guide-paths">
              {filteredPaths.map(({ series, issues, next }) => (
                <button type="button" key={series.id} className={`guide-path ${selected?.series.id === series.id ? "active" : ""}`} aria-pressed={selected?.series.id === series.id} onClick={() => setSelectedSeriesId(series.id)}>
                  <img src={issues[0].coverUrl} alt="" loading="lazy" />
                  <span>
                    <small>{series.publisher} · {issues.length} {issues.length === 1 ? "edição" : "edições"}</small>
                    <strong>{series.title}</strong>
                    <em>Primeira edição: #{issues[0].issueNumber}{next && next.id !== issues[0].id ? ` · Retome na #${next.issueNumber}` : ""}</em>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section className="guide-detail">
              <div className="guide-detail-header">
                <span className="page-kicker">Sua trilha</span>
                <h2>{selected.series.title}</h2>
                <p>{selected.series.description || `Estas são as ${selected.issues.length} edições disponíveis desta coleção em sequência editorial.`}</p>
              </div>

              {related.length > 0 && (
                <div className="guide-related">
                  <h3>Histórias relacionadas</h3>
                  <p>Explore este universo no seu ritmo. Estas conexões não são pré-requisitos confirmados.</p>
                  <div>{related.slice(0, 8).map((path) => <button type="button" key={path.series.id} onClick={() => setSelectedSeriesId(path.series.id)}>{path.series.title}<ArrowRight size={15} /></button>)}</div>
                </div>
              )}

              <div className="guide-start">
                <img src={selected.issues[0].coverUrl} alt="" />
                <div>
                  <small>Primeira edição desta coleção</small>
                  <strong>{selected.issues[0].title} · #{selected.issues[0].issueNumber}</strong>
                  <p>Comece pelo início, retome de onde parou ou abra qualquer edição abaixo.</p>
                  <div>
                    <button type="button" className="catalog-primary-action" onClick={() => onOpenReader(selected.issues[0].id)}><BookOpen /> Ler primeira edição</button>
                    {selected.next && selected.next.id !== selected.issues[0].id && <button type="button" className="catalog-secondary-action" onClick={() => onOpenReader(selected.next.id)}>Retomar na #{selected.next.issueNumber}</button>}
                  </div>
                </div>
              </div>

              <div className="guide-issues-heading"><h3 className="streaming-heading">Edições em ordem</h3><span>{selected.issues.length} {selected.issues.length === 1 ? "edição" : "edições"}</span></div>
              <ol className="guide-issues">
                {selected.issues.map((comic, index) => (
                  <li key={comic.id}>
                    <button type="button" onClick={() => onOpenReader(comic.id)}>
                      <span>{index + 1}</span>
                      <img src={comic.coverUrl} alt="" loading="lazy" />
                      <span><strong>{comic.title}</strong><small>Edição #{comic.issueNumber} · {comic.year} · {comic.progress?.status === "completed" ? "Concluída" : comic.progress?.status === "reading" ? "Em leitura" : "Não iniciada"}</small></span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
