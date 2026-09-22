import React, { useState, useEffect } from "react";
import { Sliders, CheckCircle2, Bookmark } from "lucide-react";
import { Comic } from "../../types/comic";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { formatPercentage } from "../../lib/formatters";

interface ProgressUpdateModalProps {
  comic: Comic | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveProgress: (comicId: string, currentPage: number, totalPages: number) => void;
}

export const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  comic,
  isOpen,
  onClose,
  onSaveProgress,
}) => {
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    if (comic) {
      setPage(comic.progress?.currentPage || 1);
    }
  }, [comic]);

  if (!comic) return null;

  const total = comic.totalPages;
  const percentage = Math.round((page / total) * 100);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(parseInt(e.target.value, 10));
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setPage(Math.max(1, Math.min(val, total)));
    }
  };

  const handleSave = () => {
    onSaveProgress(comic.id, page, total);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <span>Ajustar Progresso de Leitura</span>
        </div>
      }
      description={`Defina onde você parou em "${comic.title}"`}
      maxWidth="md"
      id="progress-update-modal"
    >
      <div className="space-y-5">
        {/* Status atual em destaque */}
        <div className="p-4 rounded-xl bg-[#0f121a] border border-slate-800 text-center">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Página Atual
          </span>
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              min={1}
              max={total}
              value={page}
              onChange={handleNumberInput}
              className="w-20 text-center text-3xl font-black text-amber-400 bg-slate-900 border border-slate-700 rounded-lg p-1 focus:outline-none focus:border-amber-400"
              aria-label="Número da página"
            />
            <span className="text-xl font-bold text-slate-500">/ {total}</span>
          </div>

          <div className="mt-3">
            <ProgressBar percentage={percentage} size="md" />
            <span className="text-xs font-mono text-slate-400 mt-1 block">
              {formatPercentage(percentage)} concluído
            </span>
          </div>
        </div>

        {/* Slider visual */}
        <div>
          <label htmlFor="progress-slider" className="text-xs font-semibold text-slate-300 block mb-2">
            Arrastar marcador de leitura
          </label>
          <input
            id="progress-slider"
            type="range"
            min={1}
            max={total}
            value={page}
            onChange={handleSliderChange}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage(1)}
            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
          >
            Início (Pág. 1)
          </button>
          <button
            type="button"
            onClick={() => setPage(Math.floor(total / 2))}
            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
          >
            Metade (50%)
          </button>
          <button
            type="button"
            onClick={() => setPage(total)}
            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium border border-emerald-500/30 cursor-pointer transition-colors"
          >
            Concluir (100%)
          </button>
        </div>

        {/* Botões do Rodapé */}
        <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} className="font-bold">
            <Bookmark className="w-4 h-4 mr-1.5" />
            Salvar Progresso
          </Button>
        </div>
      </div>
    </Modal>
  );
};
