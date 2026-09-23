import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Heart,
  Calendar,
  FileText,
  Users,
  Tag,
  CheckCircle2,
  Sliders,
  RotateCcw,
  HardDriveDownload,
} from "lucide-react";
import { Comic } from "../../types/comic";
import { Modal } from "../ui/Modal";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { formatFileSize, formatPercentage, getStatusLabel } from "../../lib/formatters";
import { hasOffline, saveOffline } from "../../services/offlineLibrary";
import { supabase } from "../../services/supabaseClient";

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
  useEffect(() => { if (!comic || !supabase) return; void supabase.auth.getSession().then(async ({ data }) => { if (data.session) setSavedOffline(await hasOffline(data.session.user.id, comic.id)); }); }, [comic?.id]);
  const saveForOffline = async () => {
    if (!comic || !supabase) return;
    setOfflineBusy(true); setOfflineMessage("Preparando edição para leitura offline...");
    try { const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error("Entre na sua conta."); await saveOffline(data.session.user.id, comic, (bytes) => setOfflineMessage(`Salvando... ${(bytes / 1048576).toFixed(1)} MB`)); setSavedOffline(true); setOfflineMessage("Disponível offline neste dispositivo."); }
    catch (error) { setOfflineMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setOfflineBusy(false); }
  };

  if (!comic) return null;

  const percentage = comic.progress?.percentage || 0;
  const status = comic.progress?.status || "not_started";
  const isCompleted = status === "completed";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" id="comic-detail-modal">
      <div className="comic-detail-streaming flex flex-col sm:flex-row gap-6">
        {/* Coluna da Capa */}
        <div className="w-full sm:w-52 flex-shrink-0 flex flex-col items-center">
          <div className="w-48 sm:w-full rounded-xl overflow-hidden shadow-2xl shadow-black/80 border border-slate-700/80">
            {comic.coverUrl ? (
              <img src={comic.coverUrl} alt={`Capa de ${comic.title}`} className="aspect-[2/3] w-full object-cover" />
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

          {/* Botões de Ação Imediata */}
          <div className="w-full mt-4 flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onClose();
                onOpenReader(comic.id);
              }}
              className="w-full font-bold shadow-lg"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {percentage > 0 ? "Continuar Leitura" : "Iniciar Leitura"}
            </Button>

            <Button variant="secondary" size="sm" onClick={() => void saveForOffline()} disabled={offlineBusy || savedOffline} className="w-full min-w-0 text-xs"><HardDriveDownload className="w-4 h-4 mr-2" />{savedOffline ? "Disponível offline" : offlineBusy ? "Salvando..." : "Disponibilizar Offline no App"}</Button>
            {offlineMessage && <p role="status" className="text-[11px] text-amber-200 break-words">{offlineMessage}</p>}

            <div className="comic-detail-actions flex flex-col gap-2">
              <Button
                variant={isFavorite ? "danger" : "secondary"}
                size="sm"
                onClick={() => { setIsFavorite((value) => !value); void onToggleFavorite(comic.id); }}
                className="w-full min-w-0 text-xs"
                aria-pressed={isFavorite}
              >
                <Heart className={`w-3.5 h-3.5 mr-1.5 ${isFavorite ? "fill-current" : ""}`} />
                {isFavorite ? "Favoritado" : "Favoritar"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenProgressModal(comic)}
                className="w-full min-w-0 text-xs"
              >
                <Sliders className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Progresso
              </Button>
            </div>
          </div>
        </div>

        {/* Coluna de Conteúdo e Metadados */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Cabeçalho */}
          <div className="border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="amber">{comic.publisher}</Badge>
              <Badge variant="outline">{comic.year}</Badge>
              <Badge variant={isCompleted ? "emerald" : percentage > 0 ? "amber" : "default"}>
                {getStatusLabel(status)}
              </Badge>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white leading-tight mt-1">
              {comic.title}
            </h2>

            <p className="text-xs text-slate-400 font-semibold mt-1">
              Série: <span className="text-amber-400">{comic.seriesTitle}</span> • Edição #{comic.issueNumber}
            </p>
          </div>

          {/* Progresso de Leitura */}
          <div className="py-3 border-b border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
              <span>Progresso de Leitura</span>
              <span className="font-mono text-amber-400 font-bold">
                Pág. {comic.progress?.currentPage || 0} de {comic.totalPages} ({formatPercentage(percentage)})
              </span>
            </div>
            <ProgressBar percentage={percentage} status={status} size="md" />

            <div className="mt-2 flex items-center justify-end gap-2">
              {!isCompleted ? (
                <button
                  onClick={() => onMarkCompleted(comic.id, comic.totalPages)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Marcar como lida
                </button>
              ) : (
                <button
                  onClick={() => onResetProgress(comic.id)}
                  className="text-[11px] text-slate-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Zerar progresso
                </button>
              )}
            </div>
          </div>

          {/* Sinopse */}
          <div className="py-3 border-b border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Sinopse
            </h4>
            <p className="comic-detail-synopsis text-slate-300">
              {comic.synopsis}
            </p>
          </div>

          {/* Ficha Criativa */}
          <div className="py-3 border-b border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Roteiro</span>
              <span className="text-slate-200 font-medium">{comic.writers.join(", ")}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Arte e Desenho</span>
              <span className="text-slate-200 font-medium">{comic.pencillers.join(", ")}</span>
            </div>
            {comic.characters.length > 0 && (
              <div className="col-span-2 pt-1">
                <span className="text-slate-400 text-[11px] block">Personagens em Destaque</span>
                <span className="text-amber-300/90 font-medium">{comic.characters.join(", ")}</span>
              </div>
            )}
          </div>

          {/* Arquivo & Tags */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
            <span>{comic.fileName}</span>
            <span>{comic.totalPages} páginas • {formatFileSize(comic.fileSizeMb)}</span>
          </div>

          {comic.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {comic.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
