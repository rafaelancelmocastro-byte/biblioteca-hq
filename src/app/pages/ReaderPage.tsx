import React, { useState, useEffect, useCallback } from "react";
import { Comic } from "../../types/comic";
import { getCoverUrls, getSupabaseComicById } from "../../services/supabaseCatalogRepository";
import { getComicReadUrl } from "../../services/comicRead";
import { ComicReader } from "../../components/reader/ComicReader";
import { PublicationReader } from "../../components/reader/PublicationReader";
import { CbrReader } from "../../components/reader/CbrReader";
import type { NextIssue } from "../../components/reader/ReaderChrome";
import { publicationFormat } from "../../services/publicationFormats";
import { applyQueuedProgress, saveReadingProgress } from "../../services/offlineProgress";
import { Button } from "../../components/ui/Button";
import { ArrowLeft, BookX } from "lucide-react";
import { listOffline, readOffline } from "../../services/offlineLibrary";
import { ensureActiveSession, supabase } from "../../services/supabaseClient";

interface ReaderPageProps {
  comicId: string;
  onBack: () => void;
  onOpenReader: (id: string) => void;
  fallbackUserId?: string;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({ comicId, onBack, onOpenReader, fallbackUserId = "" }) => {
  const [comic, setComic] = useState<Comic | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfData, setPdfData] = useState<Uint8Array | undefined>();
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nextComicId, setNextComicId] = useState<string | null>(null);
  const [nextIssue, setNextIssue] = useState<NextIssue | null>(null);
  const [findNextNow, setFindNextNow] = useState(false);
  const updateProgress = useCallback((id: string, page: number, total: number) => {
    void saveReadingProgress(userId, id, page, total);
    if (page >= total - 3) setFindNextNow(true);
  }, [userId]);

  useEffect(() => {
    let active = true;
    const findNext = async () => {
      if (!comic?.seriesId) return;
      type Issue = { id: string; issue_number: number; volume: number | null; publication_year: number };
      let issues: Issue[] = [];
      let offlineIssues: Comic[] = [];
      if (navigator.onLine && supabase) {
        try {
          const { data, error } = await supabase.from("comics").select("id,issue_number,volume,publication_year").eq("series_id", comic.seriesId);
          if (!error) issues = data || [];
        } catch { /* A cópia offline ainda pode fornecer o próximo capítulo. */ }
      }
      if (!issues.length && userId) {
        offlineIssues = (await listOffline(userId)).map(({ comic: item }) => item).filter((item) => item.seriesId === comic.seriesId);
        issues = offlineIssues.map((item) => ({ id: item.id, issue_number: item.issueNumber, volume: item.volume ?? null, publication_year: item.year }));
      }
      if (!active) return;
      issues.sort((a, b) => (a.volume || 0) - (b.volume || 0) || a.issue_number - b.issue_number || a.publication_year - b.publication_year);
      const currentIndex = issues.findIndex((item) => item.id === comicId);
      const nextId = currentIndex < 0 ? null : issues[currentIndex + 1]?.id || null;
      setNextComicId(nextId);
      const offlineNext = offlineIssues.find((item) => item.id === nextId);
      setNextIssue(offlineNext ? { title: offlineNext.title, issueNumber: offlineNext.issueNumber, coverUrl: offlineNext.coverUrl } : null);
      if (nextId && navigator.onLine) {
        try {
          const next = await getSupabaseComicById(nextId);
          if (next && active) {
            setNextIssue({ title: next.title, issueNumber: next.issueNumber, coverUrl: next.coverUrl });
            if (!next.coverUrl) void getCoverUrls([next]).then((urls) => {
              if (active && urls[nextId]) setNextIssue({ title: next.title, issueNumber: next.issueNumber, coverUrl: urls[nextId] });
            }).catch(() => { /* A próxima edição permanece acessível sem capa. */ });
          }
        } catch { /* O botão continua disponível sem a prévia da capa. */ }
      }
    };
    if (findNextNow) void findNext();
    return () => { active = false; };
  }, [comic?.seriesId, comicId, findNextNow, userId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setFindNextNow(false);
    setNextComicId(null);
    setNextIssue(null);

    (async () => {
      let activeSession = null;
      try {
        activeSession = await ensureActiveSession();
      } catch {
        // activeSession failed
      }
      const resolvedUserId = activeSession?.user.id || fallbackUserId;
      if (isMounted) setUserId(resolvedUserId);

      if (navigator.onLine) {
        try {
          const [data, url] = await Promise.all([
            getSupabaseComicById(comicId),
            getComicReadUrl(comicId),
          ]);
          if (data && url && isMounted) {
            setComic(activeSession ? applyQueuedProgress(activeSession.user.id, [data])[0] : data);
            if (data.progress && data.progress.currentPage >= data.totalPages - 3) setFindNextNow(true);
            setPdfUrl(url);
            setIsLoading(false);
            if (!data.coverUrl) {
              void getCoverUrls([data]).then((urls) => {
                if (isMounted && urls[data.id]) {
                  setComic((current) => current?.id === data.id ? { ...current, coverUrl: urls[data.id] } : current);
                }
              }).catch(() => {});
            }
            return;
          }
        } catch (onlineErr) {
          console.warn("Falha no carregamento online da HQ, tentando cópia offline:", onlineErr);
        }
      }

      if (isMounted) {
        try {
          const session = activeSession || (await supabase?.auth.getSession())?.data.session;
          const offlineUserId = session?.user.id || fallbackUserId;
          const offline = offlineUserId ? await readOffline(offlineUserId, comicId) : null;
          if (offline && isMounted) {
            setComic(applyQueuedProgress(offlineUserId, [offline.comic])[0]);
            setPdfData(offline.data);
            setIsLoading(false);
            return;
          }
        } catch (offlineErr) {
          console.warn("Falha ao recuperar cópia offline:", offlineErr);
        }
      }

      if (isMounted) setIsLoading(false);
    })().catch(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [comicId, fallbackUserId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#080a0f] flex flex-col items-center justify-center z-50">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-400">Carregando edição e preparando páginas...</p>
      </div>
    );
  }

  if (!comic || (!pdfUrl && !pdfData)) {
    return (
      <div className="fixed inset-0 bg-[#080a0f] flex flex-col items-center justify-center p-6 text-center z-50">
        <BookX className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-bold text-white mb-1">HQ não encontrada</h2>
        <p className="text-xs text-slate-400 mb-6 max-w-sm">
          A edição solicitada não existe ou foi removida do catálogo da biblioteca.
        </p>
        <Button variant="primary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  if (["cbr", "cbz"].includes(publicationFormat(comic.fileName) || "")) return <CbrReader comic={comic} fileUrl={pdfUrl} fileData={pdfData} onBack={onBack} onNextChapter={nextComicId ? () => onOpenReader(nextComicId) : undefined} nextIssue={nextIssue} onUpdateProgress={updateProgress} />;
  if (publicationFormat(comic.fileName) && publicationFormat(comic.fileName) !== "pdf") return <PublicationReader comic={comic} fileUrl={pdfUrl} fileData={pdfData} onBack={onBack} onNextChapter={nextComicId ? () => onOpenReader(nextComicId) : undefined} onUpdateProgress={updateProgress} />;

  return (
    <ComicReader
      comic={comic}
      pdfUrl={pdfUrl}
      pdfData={pdfData}
      onBack={onBack}
      onNextChapter={nextComicId ? () => onOpenReader(nextComicId) : undefined}
      nextIssue={nextIssue}
      onUpdateProgress={updateProgress}
    />
  );
};
