import React from "react";
import { BookOpen, CheckCircle2, Info, RotateCcw, Sliders } from "lucide-react";
import type { Comic } from "../../types/comic";

type Props = {
  comic: Comic;
  onClose: () => void;
  onOpenReader: (id: string) => void;
  onOpenDetails: (comic: Comic) => void;
  onOpenProgressModal: (comic: Comic) => void;
  onMarkCompleted: (id: string, pages: number) => void;
  onResetProgress: (id: string) => void;
};

export const ComicActions: React.FC<Props> = ({ comic, onClose, onOpenReader, onOpenDetails, onOpenProgressModal, onMarkCompleted, onResetProgress }) => {
  const act = (action: () => void) => { onClose(); action(); };
  const completed = comic.progress?.status === "completed";
  return <div className="comic-action-list">
    <button type="button" onClick={() => act(() => onOpenReader(comic.id))}><BookOpen className="text-amber-400" /><span>{(comic.progress?.percentage || 0) > 0 ? "Continuar lendo" : "Começar leitura"}</span></button>
    <button type="button" onClick={() => act(() => onOpenDetails(comic))}><Info className="text-sky-400" /><span>Ver detalhes</span></button>
    <button type="button" onClick={() => act(() => onOpenProgressModal(comic))}><Sliders className="text-amber-400" /><span>Ajustar progresso</span></button>
    {!completed
      ? <button type="button" onClick={() => act(() => onMarkCompleted(comic.id, comic.totalPages))}><CheckCircle2 className="text-emerald-400" /><span>Marcar como lida</span></button>
      : <button type="button" onClick={() => act(() => onResetProgress(comic.id))}><RotateCcw className="text-slate-300" /><span>Reiniciar leitura</span></button>}
  </div>;
};
