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

  return <div className="streaming-page reading-guide-page">
    <header className="page-spotlight"><span className="page-kicker"><Compass /> Guia de leitura</span><h1>Por onde começar?</h1><p>Explore a ordem das edições e histórias relacionadas. Você pode começar por qualquer HQ.</p></header>
    <section className="guide-search-panel"><label htmlFor="guide-search"><Search /> O que você quer ler?</label><input id="guide-search" type="search" placeholder="Ex.: Superman, X-Men, Action Comics..." value={query} onChange={(event) => { setQuery(event.target.value); setSelectedSeriesId(null); }} /><p>Volume e número mostram a sequência editorial dentro de cada coleção. O ano de publicação não define a cronologia da história; conexões entre coleções são sugestões, não leituras obrigatórias.</p></section>
    {isLoading ? <p className="guide-empty">Carregando caminhos de leitura...</p> : !filteredPaths.length && !selectedSeriesId ? <p className="guide-empty">Não encontramos uma trilha para essa busca. Tente o nome da coleção, personagem ou editora.</p> : <div className="guide-layout">
      <div className="guide-paths" aria-label="Caminhos de leitura">{filteredPaths.map(({ series, issues, next }) => <button type="button" key={series.id} className={`guide-path ${selected?.series.id === series.id ? "active" : ""}`} onClick={() => setSelectedSeriesId(series.id)}><img src={issues[0].coverUrl} alt="" loading="lazy" /><span><small>{series.publisher} · {issues.length} {issues.length === 1 ? "edição" : "edições"}</small><strong>{series.title}</strong><em>Primeira edição: #{issues[0].issueNumber}{next && next.id !== issues[0].id ? ` · Retome na #${next.issueNumber}` : ""}</em></span><ArrowRight /></button>)}</div>
      {selected && <section className="guide-detail"><div className="guide-detail-header"><span className="page-kicker">Sua trilha</span><h2>{selected.series.title}</h2><p>{selected.series.description || `Estas são as ${selected.issues.length} edições disponíveis desta coleção em sequência editorial.`}</p></div>
        {related.length > 0 && <div className="guide-related"><h3>Para entender melhor este universo</h3><p>Estas histórias estão ligadas pela organização do acervo. Explore o contexto que interessar; nenhuma é pré-requisito confirmado para começar.</p><div>{related.slice(0, 8).map((path) => <button type="button" key={path.series.id} onClick={() => setSelectedSeriesId(path.series.id)}>{path.series.title}<ArrowRight size={15} /></button>)}</div></div>}
        <div className="guide-start"><img src={selected.issues[0].coverUrl} alt="" /><div><small>Primeira edição desta coleção</small><strong>{selected.issues[0].title} · #{selected.issues[0].issueNumber}</strong><p>Se você já começou, retome na próxima edição não concluída. Também pode abrir qualquer edição abaixo.</p><div><button type="button" className="catalog-primary-action" onClick={() => onOpenReader(selected.issues[0].id)}><BookOpen /> Ler primeira edição</button>{selected.next && selected.next.id !== selected.issues[0].id && <button type="button" className="catalog-secondary-action" onClick={() => onOpenReader(selected.next.id)}>Retomar na #{selected.next.issueNumber}</button>}</div></div></div>
        <ol className="guide-issues">{selected.issues.map((comic, index) => <li key={comic.id}><button type="button" onClick={() => onOpenReader(comic.id)}><span>{index + 1}</span><img src={comic.coverUrl} alt="" loading="lazy" /><span><strong>{comic.title}</strong><small>Edição #{comic.issueNumber} · {comic.year} · {comic.progress?.status === "completed" ? "Concluída" : comic.progress?.status === "reading" ? "Em leitura" : "Não iniciada"}</small></span><ArrowRight /></button></li>)}</ol>
      </section>}
    </div>}
  </div>;
};
