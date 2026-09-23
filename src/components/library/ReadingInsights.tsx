import type { Comic } from "../../types/comic";
import { readingInsights } from "../../lib/readingInsights";

export function ReadingInsights({ comics }: { comics: Comic[] }) {
  const stats = readingInsights(comics);
  return <section className="reading-insights" aria-labelledby="reading-insights-title"><div><span className="page-kicker">Sua jornada</span><h2 id="reading-insights-title">Seu ano de leitura</h2><p>Seu histórico e favoritos ajudam a roleta a encontrar histórias para você.</p></div><div className="reading-insights-metrics"><div><strong>{stats.readThisYear}</strong><span>HQs concluídas em {stats.year}</span></div><div><strong>{stats.pagesThisYear.toLocaleString("pt-BR")}</strong><span>páginas concluídas no ano</span></div><div><strong>{stats.pending}</strong><span>leituras em andamento</span></div></div><details><summary>Ver preferências de leitura</summary><p><b>Personagens:</b> {stats.favoriteCharacters.join(", ") || "Leia ou favorite HQs para descobrir"}</p><p><b>Editoras:</b> {stats.favoritePublishers.join(", ") || "Ainda sem preferência"}</p><small>Contagem baseada nas edições concluídas e favoritas registradas no seu perfil.</small></details></section>;
}
