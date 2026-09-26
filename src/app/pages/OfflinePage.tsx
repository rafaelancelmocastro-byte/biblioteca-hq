import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Trash2 } from "lucide-react";
import { useLibrary } from "../../hooks/useLibrary";
import { clearOffline, listOffline, removeOffline, saveOffline, verifyOffline } from "../../services/offlineLibrary";
import { addOfflineLibraryItem, getOfflineLibraryIds, removeOfflineLibraryItem } from "../../services/offlineManifest";
import type { Comic } from "../../types/comic";

type Saved = { comic: Comic; size: number; savedAt: string; cover?: Blob };

export function OfflinePage({ userId, onOpenReader }: { userId: string; onOpenReader: (id: string) => void }) {
  const { allComics } = useLibrary();
  const [items, setItems] = useState<Saved[]>([]);
  const [manifestIds, setManifestIds] = useState<Set<string>>(new Set());
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [check, setCheck] = useState("");
  const [checking, setChecking] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  const refresh = async () => {
    const local = await listOffline(userId);
    setItems(local);

    const ids = await getOfflineLibraryIds(userId);
    if (navigator.onLine) {
      const missing = local.filter((item) => !ids.has(item.comic.id));
      if (missing.length) {
        await Promise.all(missing.map((item) => addOfflineLibraryItem(item.comic.id, userId)));
        for (const item of missing) ids.add(item.comic.id);
      }
    }
    setManifestIds(new Set(ids));
  };

  useEffect(() => {
    void refresh();
  }, [userId]);

  useEffect(() => {
    const onOnline = () => void refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [userId]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const item of items) {
      if (item.cover) urls[item.comic.id] = URL.createObjectURL(item.cover);
    }
    setCovers(urls);
    return () => Object.values(urls).forEach(URL.revokeObjectURL);
  }, [items]);

  const localIds = useMemo(() => new Set(items.map((item) => item.comic.id)), [items]);
  const localById = useMemo(() => new Map(items.map((item) => [item.comic.id, item])), [items]);
  const accountComics = useMemo(
    () => allComics.filter((comic) => manifestIds.has(comic.id)),
    [allComics, manifestIds]
  );
  const pendingComics = useMemo(
    () => accountComics.filter((comic) => !localIds.has(comic.id)),
    [accountComics, localIds]
  );
  const totalBytes = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items]);
  const totalMb = totalBytes / 1048576;
  const pendingMb = useMemo(
    () => pendingComics.reduce((sum, comic) => sum + (comic.fileSizeMb || 0), 0),
    [pendingComics]
  );

  const verifyAll = async () => {
    setChecking(true);
    const failed: string[] = [];
    let done = 0;
    for (const item of items) {
      try {
        await verifyOffline(userId, item.comic.id);
      } catch {
        failed.push(item.comic.title);
      }
      done += 1;
      setCheck(`Verificando arquivos offline: ${done}/${items.length}`);
    }
    setCheck(
      failed.length
        ? `${failed.length} arquivo(s) precisam ser salvos novamente: ${failed.join(", ")}`
        : `${done} arquivo(s) verificados e prontos para leitura sem internet.`
    );
    setChecking(false);
  };

  const clearThisDevice = async () => {
    if (!window.confirm("Remover todas as edições salvas apenas deste dispositivo?")) return;
    await clearOffline(userId);
    setCheck("");
    await refresh();
  };

  const downloadComic = async (comic: Comic) => {
    setSyncBusy(true);
    setCheck(`Baixando ${comic.title}...`);
    try {
      await saveOffline(userId, comic, (bytes) =>
        setCheck(`Baixando ${comic.title}: ${(bytes / 1048576).toFixed(1)} MB`)
      );
      await addOfflineLibraryItem(comic.id, userId);
      await refresh();
      setCheck(`${comic.title} está disponível neste dispositivo.`);
    } catch (error) {
      setCheck(error instanceof Error ? error.message : "Não foi possível baixar esta edição.");
    } finally {
      setSyncBusy(false);
    }
  };

  const downloadPending = async () => {
    if (!pendingComics.length) return;
    setSyncBusy(true);
    let done = 0;
    try {
      for (const comic of pendingComics) {
        setCheck(`Baixando para este dispositivo: ${done + 1}/${pendingComics.length} · ${comic.title}`);
        await saveOffline(userId, comic);
        await addOfflineLibraryItem(comic.id, userId);
        done += 1;
      }
      await refresh();
      setCheck(`${done} ${done === 1 ? "edição baixada" : "edições baixadas"} neste dispositivo.`);
    } catch (error) {
      await refresh();
      setCheck(error instanceof Error ? error.message : "Um dos downloads não pôde ser concluído.");
    } finally {
      setSyncBusy(false);
    }
  };

  const removeFromDevice = async (comicId: string) => {
    await removeOffline(userId, comicId);
    await refresh();
  };

  const removeFromAccount = async (comicId: string) => {
    await removeOfflineLibraryItem(comicId, userId);
    setManifestIds((current) => {
      const next = new Set(current);
      next.delete(comicId);
      return next;
    });
  };

  return (
    <div className="streaming-page offline-page space-y-10 sm:space-y-12">
      <header className="px-1 pt-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Sua biblioteca offline</span>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Baixados offline</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
              A seleção é sincronizada com sua conta; os arquivos precisam ser baixados em cada dispositivo.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span><strong className="font-semibold text-white">{manifestIds.size}</strong> na conta</span>
            <span><strong className="font-semibold text-white">{items.length}</strong> neste dispositivo</span>
            <span><strong className="font-semibold text-white">{totalMb.toFixed(1)} MB</strong> usados</span>
          </div>
        </div>
      </header>

      {(items.length > 0 || pendingComics.length > 0) && (
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 sm:p-4" aria-label="Gerenciar biblioteca offline">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">Sincronização por dispositivo</h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                {pendingComics.length
                  ? `${pendingComics.length} ${pendingComics.length === 1 ? "edição da sua conta ainda não está" : "edições da sua conta ainda não estão"} neste dispositivo${pendingMb > 0 ? ` · cerca de ${pendingMb.toFixed(1)} MB` : ""}.`
                  : "Tudo que está marcado na sua conta já foi baixado neste dispositivo."}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
              {pendingComics.length > 0 && (
                <button
                  type="button"
                  disabled={syncBusy || !navigator.onLine}
                  onClick={() => void downloadPending()}
                  className="catalog-primary-action w-full disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Baixar {pendingComics.length === 1 ? "pendente" : "pendentes"} neste dispositivo
                </button>
              )}
              {items.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={checking}
                    onClick={() => void verifyAll()}
                    className="catalog-secondary-action w-full disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {checking ? "Verificando..." : "Verificar arquivos"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearThisDevice()}
                    className="catalog-secondary-action w-full lg:w-auto"
                  >
                    <Trash2 className="h-4 w-4" /> Limpar este dispositivo
                  </button>
                </>
              )}
            </div>
          </div>
          {check && (
            <p role="status" className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs leading-relaxed text-neutral-300">
              {check}
            </p>
          )}
        </section>
      )}

      {accountComics.length ? (
        <section className="space-y-4" aria-labelledby="offline-items-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h2 id="offline-items-title" className="text-xl font-bold tracking-tight text-white">Sua biblioteca offline</h2>
              <p className="mt-0.5 text-xs text-neutral-400">
                Itens marcados na sua conta. O status abaixo mostra se o arquivo já existe neste dispositivo.
              </p>
            </div>
            <span className="text-xs text-neutral-500">{accountComics.length}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {accountComics.map((comic) => {
              const local = localById.get(comic.id);
              const localCover = covers[comic.id];
              return (
                <article
                  key={comic.id}
                  className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2.5 transition-colors hover:bg-white/[0.045] sm:p-3"
                >
                  <button
                    type="button"
                    disabled={!local}
                    onClick={() => local && onOpenReader(comic.id)}
                    className="block w-full min-w-0 text-left disabled:cursor-default"
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900">
                      {(localCover || comic.coverUrl) ? (
                        <img src={localCover || comic.coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-neutral-700">
                          <Download className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <span className="mt-2 block truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      {comic.seriesTitle} · #{comic.issueNumber}
                    </span>
                    <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">
                      {comic.title}
                    </h3>
                    <span className={`mt-1 block text-[10.5px] ${local ? "text-emerald-300/80" : "text-neutral-500"}`}>
                      {local
                        ? `Neste dispositivo · ${(local.size / 1048576).toFixed(1)} MB`
                        : navigator.onLine
                        ? "Na sua conta · baixar neste dispositivo"
                        : "Na sua conta · conecte-se para baixar"}
                    </span>
                  </button>

                  <div className="mt-3 grid gap-2">
                    {!local && (
                      <button
                        type="button"
                        disabled={syncBusy || !navigator.onLine}
                        onClick={() => void downloadComic(comic)}
                        className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[11px] font-semibold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar neste dispositivo
                      </button>
                    )}
                    {local && (
                      <button
                        type="button"
                        onClick={() => void removeFromDevice(comic.id)}
                        className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.06]"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remover deste dispositivo
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!navigator.onLine}
                      onClick={() => void removeFromAccount(comic.id)}
                      className="text-[10.5px] text-neutral-500 transition-colors hover:text-neutral-300 disabled:opacity-40"
                    >
                      Remover da biblioteca offline da conta
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : items.length ? (
        <section className="space-y-4">
          <div className="empty-collection-kind">
            <Download />
            <h2>Sincronizando biblioteca offline</h2>
            <p>Suas cópias locais serão associadas à sua conta quando houver conexão.</p>
          </div>
        </section>
      ) : (
        <div className="empty-collection-kind">
          <Download />
          <h2>Nenhuma edição na biblioteca offline</h2>
          <p>Abra os detalhes de uma HQ e escolha “Baixar Offline”. Ela aparecerá aqui também nos seus outros dispositivos.</p>
        </div>
      )}
    </div>
  );
}
