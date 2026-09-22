import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  id?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
  id = "modal-dialog",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-label={!title ? "Detalhes da HQ" : undefined}
      id={id}
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        className={`streaming-modal relative w-full ${maxWidthClass} z-10 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto my-auto transform transition-transform`}
      >
        <button
          onClick={onClose}
          className="modal-close-button sticky top-3 float-right mr-3 mt-3 z-[60] grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/90 text-white shadow-2xl backdrop-blur-md transition-colors hover:bg-slate-800 cursor-pointer"
          aria-label="Fechar detalhes"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho do modal */}
        {(title || description) && (
          <div className="flex items-start justify-between p-4 pr-14 sm:p-5 sm:pr-16 border-b border-slate-800/80">
            <div>
              {title && (
                <h2
                  id={`${id}-title`}
                  className="text-base sm:text-lg font-bold text-white tracking-tight"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-slate-400 mt-1">{description}</p>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="modal-content p-4 pt-14 sm:p-6 sm:pt-14">{children}</div>
      </div>
    </div>
  );
};
