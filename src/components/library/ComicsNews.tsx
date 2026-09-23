import { useEffect, useState } from "react";

type Story = { title: string; link: string; source: string; publishedAt: string };

export function ComicsNews() {
  const [stories, setStories] = useState<Story[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/integrations/health?feed=comics", { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error(); return response.json(); }).then((data) => setStories(data.stories || [])).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);
  return <details className="comics-news"><summary>Notícias de quadrinhos <span>Atualizadas pela internet</span></summary>{error ? <p>As notícias estão indisponíveis agora. Tente novamente mais tarde.</p> : stories.length ? <div className="comics-news-list">{stories.map((story) => <a key={story.link} href={story.link} target="_blank" rel="noopener noreferrer"><strong>{story.title}</strong><small>{story.source || "Google Notícias"} · {new Date(story.publishedAt).toLocaleDateString("pt-BR")}</small></a>)}</div> : <p>Carregando notícias...</p>}<small>Fontes externas reunidas pelo Google Notícias.</small></details>;
}
