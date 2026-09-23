import React, { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Compass, Search } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import type { Comic } from "../../types/comic";

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
  }).filter((path) => path.issues.length && (!needle || [path.series.title, path.series.publisher, ...path.issues.flatMap((comic) => [comic.title, ...comic.characters, ...comic.tags])].some((value) => fold(value).includes(needle)))).sort((a, b) => Number(fold(b.series.title).includes(needle)) - Number(fold(a.series.title).includes(needle)) || a.series.title.localeCompare(b.series.title, "pt-BR")), [allComics, seriesList, needle]);
  const selected = paths.find((path) => path.series.id === selectedSeriesId) || paths[0];

  return <div className="streaming-page reading-guide-page">
    <header className="page-spotlight"><span className="page-kicker"><Compass /> Guia de leitura</span><h1>Por onde começar?</h1><p>Escolha um personagem, coleção ou editora. O guia organiza as edições que já estão na Biblioteca HQ e aponta a próxima leitura disponível.</p></header>
    <section className="guide-search-panel"><label htmlFor="guide-search"><Search /> O que você quer ler?</label><input id="guide-search" type="search" placeholder="Ex.: Superman, X-Men, Action Comics..." value={query} onChange={(event) => { setQuery(event.target.value); setSelectedSeriesId(null); }} /><p>A ordem abaixo segue volume e número da edição cadastrados. Sagas diferentes podem ter uma cronologia própria.</p></section>
    {isLoading ? <p className="guide-empty">Carregando caminhos de leitura...</p> : !paths.length ? <p className="guide-empty">Não encontramos uma trilha para essa busca. Tente o nome da coleção, personagem ou editora.</p> : <div className="guide-layout"><div className="guide-paths" aria-label="Caminhos de leitura">{paths.map(({ series, issues, next }) => <button type="button" key={series.id} className={`guide-path ${selected?.series.id === series.id ? "active" : ""}`} onClick={() => setSelectedSeriesId(series.id)}><img src={issues[0].coverUrl} alt="" loading="lazy" /><span><small>{series.publisher} · {issues.length} edição(ões)</small><strong>{series.title}</strong><em>Comece por #{issues[0].issueNumber}{next && next.id !== issues[0].id ? ` · Retome na #${next.issueNumber}` : ""}</em></span><ArrowRight /></button>)}</div>{selected && <section className="guide-detail"><div className="guide-detail-header"><span className="page-kicker">Sua trilha</span><h2>{selected.series.title}</h2><p>{selected.series.description || `Leia as ${selected.issues.length} edições disponíveis desta coleção na ordem exibida.`}</p></div><div className="guide-start"><img src={selected.issues[0].coverUrl} alt="" /><div><small>Ponto de partida no acervo</small><strong>{selected.issues[0].title} · #{selected.issues[0].issueNumber}</strong><p>Se você já começou, retome na próxima edição não concluída.</p><div><button type="button" className="catalog-primary-action" onClick={() => onOpenReader(selected.issues[0].id)}><BookOpen /> Começar do início</button>{selected.next && selected.next.id !== selected.issues[0].id && <button type="button" className="catalog-secondary-action" onClick={() => onOpenReader(selected.next.id)}>Retomar na #{selected.next.issueNumber}</button>}</div></div></div><ol className="guide-issues">{selected.issues.map((comic, index) => <li key={comic.id}><button type="button" onClick={() => onOpenReader(comic.id)}><span>{index + 1}</span><img src={comic.coverUrl} alt="" loading="lazy" /><span><strong>{comic.title}</strong><small>Edição #{comic.issueNumber} · {comic.year} · {comic.progress?.status === "completed" ? "Concluída" : comic.progress?.status === "reading" ? "Em leitura" : "Não iniciada"}</small></span><ArrowRight /></button></li>)}</ol></section>}</div>}
  </div>;
};
