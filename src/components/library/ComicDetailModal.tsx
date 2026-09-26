import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Heart,
  FileText,
  CheckCircle2,
  Sliders,
  RotateCcw,
  HardDriveDownload,
  Check,
} from "lucide-react";
import { Comic } from "../../types/comic";
import { Modal } from "../ui/Modal";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { ProgressBar } from "../ui/ProgressBar";
import { formatFileSize, formatPercentage, getStatusLabel } from "../../lib/formatters";
import { hasOffline, saveOffline } from "../../services/offlineLibrary";
import { addOfflineLibraryItem } from "../../services/offlineManifest";
import { supabase } from "../../services/supabaseClient";
import { shouldConfirmCellularDownload } from "../../services/userPreferences";

interface ComicDetailModalProps {
  comic: Comic | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReader: (comicId: string) => void;
  onToggleFavorite: (comicId: string) => void | Promise<boolean>;
  onOpenProgressModal: (comic: Comic) => void;
  onMarkCompleted: (comicId: string, totalPages: number) => void;
  onResetProgress: (comicId: string) => void;
}

export const ComicDetailModal: React.FC<ComicDetailModalProps> = ({
  comic,
  isOpen,
  onClose,
  onOpenReader,
  onToggleFavorite,
  onOpenProgressModal,
  onMarkCompleted,
  onResetProgress,
}) => {
  const [isFavorite, setIsFavorite] = useState(Boolean(comic?.isFavorite));
  const [savedOffline, setSavedOffline] = useState(false);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState("");

  useEffect(() => setIsFavorite(Boolean(comic?.isFavorite)), [comic?.id, comic?.isFavorite]);

  useEffect(() => {
    if (!comic || !supabase) return;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const saved = await hasOffline(data.session.user.id, comic.id);
      setSavedOffline(saved);
      if (saved) void addOfflineLibraryItem(comic.id, data.session.user.id);
    });
  }, [comic?.id]);

  const saveForOffline = async () => {
    if (!comic || !supabase) return;
    setOfflineBusy(true);
    setOfflineMessage("Preparando para leitura offline...");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Entre na sua conta.");
      if (await shouldConfirmCellularDownload(data.session.user.id) && !window.confirm(`Baixar ${comic.title} (${formatFileSize(comic.fileSizeMb)}) usando esta conexão móvel?`)) { setOfflineMessage("Download cancelado."); return; }
      await saveOffline(data.session.user.id, comic, (bytes) =>
        setOfflineMessage(`Salvando... ${(bytes / 1048576).toFixed(1)} MB`)
      );
      const synced = await addOfflineLibraryItem(comic.id, data.session.user.id);
      setSavedOffline(true);
      setOfflineMessage(
        synced
          ? "Disponível neste dispositivo e sincronizado com sua biblioteca offline."
          : "Disponível offline neste dispositivo."
      );
    } catch (error) {
      setOfflineMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setOfflineBusy(false);
    }
  };

  if (!comic) return null;

  const percentage = comic.progress?.percentage || 0;
  const status = comic.progress?.status || "not_started";
  const isCompleted = status === "completed";

  // Obter formato limpo do arquivo (ex: CBZ, PDF, CBR)
  const fileExtension = comic.fileName?.split(".").pop()?.toUpperCase() || "HQ";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" id="comic-detail-modal">
      <div className="comic-detail-streaming flex flex-col md:flex-row gap-5 lg:gap-7 p-1 sm:p-2">
        {/* Coluna da Capa e Ações */}
        <div className="w-full md:w-52 lg:w-56 shrink-0 flex flex-col items-center">
          <div className="w-36 sm:w-44 md:w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/90 border border-white/10 bg-neutral-900 aspect-[2/3] transition-transform duration-300">
            {comic.coverUrl ? (
              <img
                src={comic.coverUrl}
                alt={`Capa de ${comic.title}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <CoverPlaceholder
                title={comic.title}
                seriesTitle={comic.seriesTitle}
                issueNumber={comic.issueNumber}
                publisher={comic.publisher}
                coverStyle={comic.coverStyle}
              />
            )}
          </div>

          {/* Botões de Ação */}
          <div className="w-full max-w-sm md:max-w-none mt-4 flex flex-col gap-2.5">
            {/* Botão 1: Leitura */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReader(comic.id);
              }}
              className="w-full h-11 px-4 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/10 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 fill-current shrink-0" />
              <span className="truncate">{percentage > 0 ? "Retomar Leitura" : "Iniciar Leitura"}</span>
            </button>

            {/* Botão 2: Offline - Otimizado para tablets/mobiles para nunca quebrar em duas linhas */}
            <button
              type="button"
              onClick={() => void saveForOffline()}
              disabled={offlineBusy || savedOffline}
              title={savedOffline ? "Salvo Offline" : offlineBusy ? "Salvando..." : "Baixar Offline"}
              className={`w-full min-h-[2.5rem] h-10 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                savedOffline
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border-white/10 hover:border-white/20"
              }`}
            >
              {savedOffline ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <HardDriveDownload className="w-4 h-4 text-neutral-300 shrink-0" />
              )}
              <span className="truncate tracking-tight font-medium">
                {savedOffline ? "Salvo Offline" : offlineBusy ? "Salvando..." : "Baixar Offline"}
              </span>
            </button>

            {offlineMessage && (
              <p role="status" className="text-[11px] text-neutral-400 text-center break-words px-1 py-0.5">
                {offlineMessage}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  setIsFavorite((value) => !value);
                  void onToggleFavorite(comic.id);
                }}
                className={`h-10 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                  isFavorite
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 border-white/10 hover:border-white/20"
                }`}
                aria-pressed={isFavorite}
              >
                <Heart className={`w-3.5 h-3.5 shrink-0 ${isFavorite ? "fill-current text-rose-400" : "text-neutral-400"}`} />
                <span className="truncate">{isFavorite ? "Favorito" : "Favoritar"}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenProgressModal(comic)}
                className="h-10 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                <Sliders className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="truncate">Progresso</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna de Conteúdo e Metadados */}
        <div className="flex-1 flex flex-col min-w-0 justify-between">
          <div>
            {/* Metadados Superiores */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-400 mb-2">
              {comic.publisher && <span className="text-white font-semibold">{comic.publisher}</span>}
              {comic.publisher && comic.year && <span className="text-neutral-600">·</span>}
              {comic.year && <span>{comic.year}</span>}
              {(comic.publisher || comic.year) && <span className="text-neutral-600">·</span>}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                isCompleted
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : percentage > 0
                  ? "bg-white/15 text-neutral-200 border border-white/20"
                  : "bg-white/5 text-neutral-400 border border-white/10"
              }`}>
                {getStatusLabel(status)}
              </span>
            </div>

            {/* Título Principal */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {comic.title}
            </h2>

            {/* Coleção & Edição */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-neutral-400 font-medium mt-1.5">
              <span className="text-neutral-300 font-semibold">{comic.seriesTitle || "Edição Especial"}</span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-400">Edição #{comic.issueNumber}</span>
            </div>

            {/* Progresso de Leitura */}
            <div className="py-3.5 border-y border-white/10 my-3.5">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span className="font-semibold text-neutral-300">Progresso de Leitura</span>
                <span className="font-medium text-neutral-200">
                  Pág. {comic.progress?.currentPage || 0}/{comic.totalPages} ({formatPercentage(percentage)})
                </span>
              </div>
              <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${isCompleted ? "bg-emerald-400" : "bg-white"}`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-end">
                {!isCompleted ? (
                  <button
                    type="button"
                    onClick={() => onMarkCompleted(comic.id, comic.totalPages)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Marcar como lida</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onResetProgress(comic.id)}
                    className="text-xs text-neutral-400 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>Zerar progresso</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sinopse */}
            <div className="py-3 border-b border-white/10">
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                Sinopse
              </h4>
              <p className="comic-detail-synopsis text-neutral-300 text-xs sm:text-sm leading-relaxed font-normal">
                {comic.synopsis || "Nenhuma sinopse cadastrada para esta edição."}
              </p>
            </div>

            {/* Ficha Criativa */}
            {(comic.writers.length > 0 || comic.pencillers.length > 0 || comic.characters.length > 0) && (
              <div className="py-3.5 border-b border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {comic.writers.length > 0 && (
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Roteiro</span>
                    <span className="text-neutral-200 font-medium">{comic.writers.join(", ")}</span>
                  </div>
                )}
                {comic.pencillers.length > 0 && (
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Arte e Desenho</span>
                    <span className="text-neutral-200 font-medium">{comic.pencillers.join(", ")}</span>
                  </div>
                )}
                {comic.characters.length > 0 && (
                  <div className="sm:col-span-2 pt-0.5">
                    <span className="text-neutral-500 text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Personagens em Destaque</span>
                    <span className="text-neutral-200 font-medium">{comic.characters.join(", ")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé: Especificações do Arquivo & Tags */}
          <div className="pt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="font-semibold text-neutral-300">{comic.totalPages} páginas</span>
              <span className="text-neutral-600">·</span>
              <span>{formatFileSize(comic.fileSizeMb)}</span>
              <span className="text-neutral-600">·</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-neutral-300 uppercase tracking-wider">{fileExtension}</span>
            </div>

            {comic.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {comic.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] text-neutral-400 border border-white/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>

  );
};
