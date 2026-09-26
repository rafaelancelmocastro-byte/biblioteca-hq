import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Trash2 } from "lucide-react";
import { clearOffline, listOffline, removeOffline, verifyOffline } from "../../services/offlineLibrary";
import type { Comic } from "../../types/comic";

type Saved = { comic: Comic; size: number; savedAt: string; cover?: Blob };

export function OfflinePage({ userId, onOpenReader }: { userId: string; onOpenReader: (id: string) => void }) {
  const [items, setItems] = useState<Saved[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [check, setCheck] = useState("");
  const [checking, setChecking] = useState(false);

  const refresh = async () => setItems(await listOffline(userId));

  useEffect(() => {
    void refresh();
  }, [userId]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const item of items) {
      if (item.cover) urls[item.comic.id] = URL.createObjectURL(item.cover);
    }
    setCovers(urls);
    return () => Object.values(urls).forEach(URL.revokeObjectURL);
  }, [items]);

  const totalBytes = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items]);
  const totalMb = totalBytes / 1048576;

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

  const clearAll = async () => {
    if (!window.confirm("Remover todas as edições salvas neste dispositivo?")) return;
    await clearOffline(userId);
    setCheck("");
    await refresh();
  };

  return (
    <div className="streaming-page offline-page space-y-10 sm:space-y-12">
      <header className="px-1 pt-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Neste dispositivo</span>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Baixados offline</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
              Edições salvas neste navegador para leitura mesmo sem conexão.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span><strong className="font-semibold text-white">{items.length}</strong> {items.length === 1 ? "edição" : "edições"}</span>
            <span><strong className="font-semibold text-white">{totalMb.toFixed(1)} MB</strong> usados</span>
          </div>
        </div>
      </header>

      {items.length > 0 && (
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 sm:p-4" aria-label="Gerenciar arquivos offline">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Armazenamento local</h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                Estes arquivos ocupam espaço somente neste dispositivo.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap md:justify-end">
              <button
                type="button"
                disabled={checking}
                onClick={() => void verifyAll()}
                className="catalog-secondary-action w-full disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                {checking ? "Verificando..." : "Verificar arquivos"}
              </button>
              <button
                type="button"
                onClick={() => void clearAll()}
                className="catalog-secondary-action w-full md:w-auto"
              >
                <Trash2 className="h-4 w-4" /> Liberar espaço
              </button>
            </div>
          </div>
          {check && (
            <p role="status" className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs leading-relaxed text-neutral-300">
              {check}
            </p>
          )}
        </section>
      )}

      {items.length ? (
        <section className="space-y-4" aria-labelledby="offline-items-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h2 id="offline-items-title" className="text-xl font-bold tracking-tight text-white">Disponíveis offline</h2>
              <p className="mt-0.5 text-xs text-neutral-400">Toque em uma edição para abrir a leitura sem depender da rede.</p>
            </div>
            <span className="text-xs text-neutral-500">{items.length}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <article
                key={item.comic.id}
                className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2.5 transition-colors hover:bg-white/[0.045] sm:p-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenReader(item.comic.id)}
                  className="block w-full min-w-0 text-left"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900">
                    {covers[item.comic.id] ? (
                      <img src={covers[item.comic.id]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-700">
                        <Download className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <span className="mt-2 block truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    {item.comic.seriesTitle} · #{item.comic.issueNumber}
                  </span>
                  <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">
                    {item.comic.title}
                  </h3>
                  <span className="mt-1 block text-[10.5px] text-neutral-500">
                    {(item.size / 1048576).toFixed(1)} MB · disponível offline
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await removeOffline(userId, item.comic.id);
                    await refresh();
                  }}
                  className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.06]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-collection-kind">
          <Download />
          <h2>Nenhuma edição salva offline</h2>
          <p>Abra os detalhes de uma HQ e escolha “Disponibilizar Offline no App”.</p>
        </div>
      )}
    </div>
  );
}
