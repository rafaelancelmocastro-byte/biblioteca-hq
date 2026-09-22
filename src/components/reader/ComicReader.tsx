import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
  Columns2,
  FileText,
  AlignVerticalJustifyStart,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Comic } from "../../types/comic";
import { ProgressBar } from "../ui/ProgressBar";
import { formatPercentage } from "../../lib/formatters";

interface ComicReaderProps {
  comic: Comic;
  onBack: () => void;
  onUpdateProgress: (comicId: string, page: number, totalPages: number) => void;
}

export const ComicReader: React.FC<ComicReaderProps> = ({
  comic,
  onBack,
  onUpdateProgress,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(() => {
    return comic.progress?.currentPage || 1;
  });

  const [readerMode, setReaderMode] = useState<"single" | "double" | "vertical">("single");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const total = comic.totalPages;

  // Atualiza progresso automaticamente ao avançar
  useEffect(() => {
    onUpdateProgress(comic.id, currentPage, total);
  }, [comic.id, currentPage, total, onUpdateProgress]);

  const goToNextPage = useCallback(() => {
    if (readerMode === "double") {
      setCurrentPage((prev) => Math.min(prev + 2, total));
    } else {
      setCurrentPage((prev) => Math.min(prev + 1, total));
    }
  }, [readerMode, total]);

  const goToPrevPage = useCallback(() => {
    if (readerMode === "double") {
      setCurrentPage((prev) => Math.max(prev - 2, 1));
    } else {
      setCurrentPage((prev) => Math.max(prev - 1, 1));
    }
  }, [readerMode]);

  // Teclado: Setas Esquerda/Direita e teclas A/D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        goToNextPage();
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        goToPrevPage();
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        }
      } else if (e.key === "f" || e.key === "F") {
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextPage, goToPrevPage, isFullscreen]);

  // Alterna tela cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {
        setIsFullscreen(!isFullscreen);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const percentage = Math.round((currentPage / total) * 100);

  // Renderizador de página diagramada em estilo comic book
  const renderComicPage = (pageNum: number) => {
    const isCover = pageNum === 1;
    const isBackCover = pageNum === total;

    return (
      <div
        key={pageNum}
        className="relative aspect-[2/3] w-full max-w-2xl bg-[#0e121a] border border-slate-700/80 rounded-lg shadow-2xl shadow-black/90 overflow-hidden select-none flex flex-col justify-between p-4 sm:p-6 transition-transform"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
          background: isCover
            ? `linear-gradient(135deg, ${comic.coverStyle.primary}, ${comic.coverStyle.secondary})`
            : "#11151f",
        }}
      >
        {isCover ? (
          // Página 1: Capa Oficial
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                {comic.publisher}
              </span>
              <span className="text-xs font-mono font-bold text-white/80 bg-black/60 px-2 py-0.5 rounded">
                EDIÇÃO #{comic.issueNumber}
              </span>
            </div>

            <div className="my-auto text-center py-8">
              <span className="text-xs font-bold tracking-widest text-amber-400/90 uppercase block mb-1">
                {comic.seriesTitle}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {comic.title}
              </h1>
              <p className="text-xs text-slate-300 mt-3 max-w-sm mx-auto line-clamp-3">
                {comic.synopsis}
              </p>
            </div>

            <div className="text-center border-t border-white/10 pt-3 text-[10px] text-slate-400 font-mono flex justify-between items-center">
              <span>Roteiro: {comic.writers[0]}</span>
              <span>Pág. 01 (Capa)</span>
            </div>
          </div>
        ) : isBackCover ? (
          // Última Página: Contracapa / Conclusão
          <div className="h-full flex flex-col justify-between text-center py-6">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>

            <div className="my-auto">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Fim da Edição #{comic.issueNumber}
              </h2>
              <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
                Você concluiu a leitura de "{comic.title}". Seu progresso foi salvo como 100% no acervo.
              </p>
            </div>

            <div className="text-[10px] text-slate-500 font-mono">
              Página {pageNum} de {total} • {comic.seriesTitle}
            </div>
          </div>
        ) : (
          // Páginas Internas de Quadrinho: Diagramação com vinhetas e balões
          <div className="h-full flex flex-col justify-between">
            {/* Cabeçalho da página */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-b border-slate-800 pb-1.5 mb-2">
              <span className="font-bold text-amber-500/80 uppercase">{comic.seriesTitle}</span>
              <span>Pág. {pageNum}</span>
            </div>

            {/* Painéis Ilustrados Vetoriais de HQ */}
            <div className="flex-1 grid grid-cols-2 grid-rows-3 gap-2 p-1 bg-black/40 rounded border border-slate-800">
              {/* Painel 1 (Largo superior) */}
              <div className="col-span-2 row-span-1 rounded bg-gradient-to-r from-slate-900 to-slate-800 p-2.5 flex flex-col justify-between relative overflow-hidden border border-slate-700/60">
                <span className="text-[9px] uppercase tracking-wider text-amber-400 font-mono font-bold">
                  LOCAL: CIDADELA DE ÉBANO • QUADRO A
                </span>
                <p className="text-xs font-medium text-slate-200 italic line-clamp-2">
                  "O ar vibrava com a pulsação do reator alquímico. Nenhum sinal dos guardas imperiais..."
                </p>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-amber-500/10 blur-xs" />
              </div>

              {/* Painel 2 (Esquerdo) */}
              <div className="col-span-1 row-span-1 rounded bg-[#171b26] p-2 flex flex-col justify-between border border-slate-700/60 relative">
                <span className="text-[8px] font-mono text-slate-400">CLOSE-UP</span>
                <div className="w-fit bg-white/95 text-black px-2 py-1 rounded-sm text-[10px] font-black tracking-tight shadow">
                  "Rápido! Eles estão vindo!"
                </div>
              </div>

              {/* Painel 3 (Direito com Arte) */}
              <div className="col-span-1 row-span-1 rounded bg-[#131926] p-2 flex flex-col justify-end border border-slate-700/60 relative overflow-hidden">
                <div className="text-right text-[10px] font-mono font-extrabold text-amber-400">
                  *KLICK-CLACK*
                </div>
              </div>

              {/* Painel 4 (Splash inferior) */}
              <div className="col-span-2 row-span-1 rounded bg-gradient-to-t from-slate-950 via-slate-900 to-[#1b2232] p-2.5 flex items-end justify-between border border-slate-700/60">
                <p className="text-[11px] text-slate-300 font-medium max-w-xs">
                  {comic.characters[0] ? `A silhueta de ${comic.characters[0]} surge em meio à névoa de vapor.` : "A tensão atinge o clímax da cena."}
                </p>
                <span className="text-[9px] font-mono text-slate-400">CENA 0{pageNum % 4 + 1}</span>
              </div>
            </div>

            {/* Rodapé com numeração */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 mt-2 border-t border-slate-800">
              <span>{comic.publisher} Digital</span>
              <span>{pageNum}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#080a0f] text-slate-100 flex flex-col select-none overflow-hidden"
    >
      {/* Barra Superior de Controles (Discreta e Ocultável) */}
      <div
        className={`h-14 bg-[#0d1017]/95 border-b border-[#1e2535] px-3 sm:px-5 flex items-center justify-between z-30 transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        {/* Esquerda: Botão Voltar & Informações da HQ */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            title="Voltar para a biblioteca"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>

          <div className="flex flex-col overflow-hidden max-w-[200px] sm:max-w-md">
            <span className="text-xs font-bold text-white truncate leading-tight">
              {comic.title}
            </span>
            <span className="text-[10px] text-amber-400/90 font-mono">
              {comic.seriesTitle} • Edição #{comic.issueNumber}
            </span>
          </div>
        </div>

        {/* Centro: Modos de Visualização */}
        <div className="hidden md:flex items-center bg-[#141824] border border-slate-700/80 rounded-lg p-0.5">
          <button
            onClick={() => setReaderMode("single")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
              readerMode === "single"
                ? "bg-amber-500 text-black shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
            title="Página Única"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Única</span>
          </button>
          <button
            onClick={() => setReaderMode("double")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
              readerMode === "double"
                ? "bg-amber-500 text-black shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
            title="Página Dupla"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Dupla</span>
          </button>
          <button
            onClick={() => setReaderMode("vertical")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
              readerMode === "vertical"
                ? "bg-amber-500 text-black shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
            title="Leitura Vertical Contínua"
          >
            <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
            <span>Vertical</span>
          </button>
        </div>

        {/* Direita: Zoom e Tela Cheia */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom */}
          <div className="hidden sm:flex items-center bg-[#141824] border border-slate-700/80 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 px-1 min-w-[36px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 15, 150))}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tela cheia */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            aria-label="Alternar tela cheia"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Área Central de Leitura */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-3 sm:p-6 relative cursor-default"
        onClick={() => setShowControls(!showControls)}
      >
        {/* Botão Anterior Flutuante */}
        {readerMode !== "vertical" && currentPage > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevPage();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-amber-500 hover:text-black text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-xl shadow-black/80"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Botão Próximo Flutuante */}
        {readerMode !== "vertical" && currentPage < total && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNextPage();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-amber-500 hover:text-black text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-xl shadow-black/80"
            aria-label="Próxima página"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Visualização de Páginas */}
        <div
          className={`flex items-center justify-center transition-all duration-200 ${
            readerMode === "vertical"
              ? "flex-col gap-6 py-6 w-full max-w-2xl"
              : readerMode === "double"
              ? "flex-row gap-4 max-w-5xl"
              : "flex-col max-w-xl"
          }`}
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
          onClick={(e) => e.stopPropagation()}
        >
          {readerMode === "vertical" ? (
            // Modo vertical: Rola todas as páginas
            Array.from({ length: total }, (_, i) => i + 1).map((pageNum) =>
              renderComicPage(pageNum)
            )
          ) : readerMode === "double" ? (
            // Modo página dupla
            <>
              {renderComicPage(currentPage)}
              {currentPage + 1 <= total && renderComicPage(currentPage + 1)}
            </>
          ) : (
            // Modo página única
            renderComicPage(currentPage)
          )}
        </div>
      </div>

      {/* Miniaturas de Páginas Rápidas (Gaveta opcional) */}
      {showThumbnails && (
        <div className="h-28 bg-[#0a0d14] border-t border-[#1e2535] p-2 flex items-center gap-2 overflow-x-auto z-30">
          {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`flex-shrink-0 w-14 aspect-[2/3] rounded border text-[9px] font-mono flex items-center justify-center cursor-pointer transition-all ${
                p === currentPage
                  ? "border-amber-400 bg-amber-500/20 text-amber-300 font-bold scale-105"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Barra Inferior com Progresso e Navegação Rápida */}
      <div
        className={`h-14 bg-[#0d1017]/95 border-t border-[#1e2535] px-4 sm:px-6 flex items-center justify-between z-30 transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`text-xs font-medium px-2 py-1 rounded cursor-pointer ${
              showThumbnails ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-white"
            }`}
          >
            {showThumbnails ? "Ocultar Páginas" : "Ver Todas as Páginas"}
          </button>
        </div>

        {/* Indicador Central de Página com Slider rápido */}
        <div className="flex items-center gap-3 max-w-xs sm:max-w-md w-full mx-4">
          <span className="text-xs font-mono text-slate-300 font-bold whitespace-nowrap">
            {currentPage} / {total}
          </span>
          <div className="flex-1">
            <input
              type="range"
              min={1}
              max={total}
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              aria-label="Pular para página"
            />
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold whitespace-nowrap">
            {formatPercentage(percentage)}
          </span>
        </div>

        {/* Botão Atalhos de Teclado */}
        <div className="hidden sm:flex items-center text-[10px] text-slate-400 font-mono gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">→</kbd>
          <span>Navegar</span>
        </div>
      </div>
    </div>
  );
};
