import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Gift, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ensureActiveSession } from "../../services/supabaseClient";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TELEGRAM_URL = "https://t.me/magraodotrafego";

const GuideViewer: React.FC<{ isOwner?: boolean }> = ({ isOwner = false }) => {
  const holderRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (status !== "loading") return;

    let active = true;
    let pdf: PDFDocumentProxy | null = null;

    const renderGuide = async () => {
      try {
        const session = await ensureActiveSession();
        if (!session?.access_token) throw new Error("Sua sessão expirou. Entre novamente.");

        const response = await fetch("/api/storage/vip-guide", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.readUrl) throw new Error(payload?.error || "O guia ainda não está disponível.");

        const fileResponse = await fetch(payload.readUrl, { cache: "no-store" });
        if (!fileResponse.ok) throw new Error("O guia ainda não foi enviado ao armazenamento VIP.");
        const bytes = await fileResponse.arrayBuffer();

        pdf = await getDocument({ data: bytes, disableAutoFetch: true }).promise;
        if (!active || !holderRef.current) return;
        holderRef.current.replaceChildren();

        const maxWidth = Math.min(holderRef.current.clientWidth || 920, 920);
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (!active || !holderRef.current) return;
          const page = await pdf.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.max(0.6, Math.min(1.7, maxWidth / base.width));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = "mx-auto block h-auto w-full max-w-[920px] rounded-2xl bg-white shadow-2xl shadow-black/30";
          canvas.setAttribute("aria-label", `Página ${pageNumber} do guia`);
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Não foi possível preparar a página do guia.");
          holderRef.current.append(canvas);
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          page.cleanup();
        }

        if (active) setStatus("ready");
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Não foi possível abrir o guia.");
          setStatus("error");
        }
      }
    };

    void renderGuide();
    return () => {
      active = false;
      void pdf?.destroy().catch(() => {});
    };
  }, [status]);

  const uploadGuide = async (file: File) => {
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setMessage("Selecione o PDF do Guia Definitivo de Leitura Marvel e DC.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("O PDF excede o limite de 20 MB.");
      return;
    }

    setUploading(true);
    setMessage("");
    try {
      const session = await ensureActiveSession(true);
      if (!session?.access_token) throw new Error("Sua sessão expirou. Entre novamente.");

      const response = await fetch("/api/storage/vip-guide-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.uploadUrl) throw new Error(payload?.error || "Não foi possível preparar o envio.");

      const upload = await fetch(payload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!upload.ok) throw new Error("O R2 recusou o envio do guia.");

      setStatus("loading");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar o guia.");
      setStatus("error");
    } finally {
      setUploading(false);
    }
  };

  if (status === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStatus("loading")}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-neutral-200 sm:w-auto"
      >
        <FileText className="h-4 w-4" /> Abrir guia no sistema
      </button>
    );
  }

  return (
    <div className="mt-6">
      {status === "loading" && <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-neutral-300">Preparando o guia exclusivo...</div>}
      {status === "error" && (
        <div role="alert" className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5 text-sm text-amber-100">
          <p>{message}</p>
          {isOwner && (
            <label className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-black transition hover:bg-neutral-200 sm:w-auto">
              <UploadCloud className="h-4 w-4" />
              {uploading ? "Enviando guia..." : "Enviar PDF ao armazenamento VIP"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadGuide(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>
      )}
      <div
        ref={holderRef}
        onContextMenu={(event) => event.preventDefault()}
        className={`space-y-4 select-none ${status === "ready" ? "" : "hidden"}`}
        aria-label="Visualizador do Guia Definitivo de Leitura Marvel e DC"
      />
      {status === "ready" && <p className="mt-4 text-center text-xs text-neutral-500">Visualização exclusiva dentro da Biblioteca HQ. O sistema não exibe opção de download.</p>}
    </div>
  );
};

export const VipBonusesPage: React.FC<{ isOwner?: boolean }> = ({ isOwner = false }) => {
  return (
    <div className="streaming-page space-y-8 sm:space-y-10">
      <header className="px-1 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/80">Acesso vitalício</span>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Bônus VIP</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-400 sm:text-base">Conteúdos extras liberados junto com seu acesso vitalício à Biblioteca HQ.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-3 py-1.5 text-xs font-semibold text-amber-200">
            <ShieldCheck className="h-4 w-4" /> Exclusivo para membros
          </span>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0d1118]/90 shadow-2xl shadow-black/10">
          <div className="relative aspect-[3.56/1] w-full overflow-hidden border-b border-white/[0.08] bg-black">
            <img
              src="/vip/marvel-dc-banner.webp"
              alt="Heróis Marvel e DC"
              className="h-full w-full object-cover object-center"
              loading="eager"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d1118]/35 via-transparent to-black/5" />
          </div>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300"><FileText className="h-5 w-5" /></span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Bônus 01</span>
            </div>
            <h2 className="mt-5 text-xl font-black tracking-tight text-white sm:text-2xl">Guia completo das principais leituras de Marvel & DC</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">Um mapa de leitura exclusivo com mega sagas e fases essenciais para começar ou organizar sua jornada pelos universos Marvel e DC.</p>
            <GuideViewer isOwner={isOwner} />
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-white/[0.08] bg-[#0d1118]/90 p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300"><Sparkles className="h-5 w-5" /></span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Bônus 02</span>
          </div>
          <h2 className="mt-5 text-xl font-black tracking-tight text-white sm:text-2xl">Canal VIP para pedidos e sugestões</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-400">Entre no canal reservado para enviar sugestões de títulos, pedidos de inclusão e acompanhar avisos exclusivos da Biblioteca HQ.</p>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-5 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-400/15 sm:w-auto"
          >
            Acessar canal VIP <ExternalLink className="h-4 w-4" />
          </a>
        </article>
      </section>

      <section className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <h2 className="font-bold text-white">Seu acesso acompanha os bônus</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">A disponibilidade segue o status do acesso vitalício. Se o acesso for revogado, os bônus deixam de ficar disponíveis automaticamente.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
