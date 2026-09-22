import React from "react";
import { ComicCoverPalette } from "../../types/comic";

interface CoverPlaceholderProps {
  title: string;
  seriesTitle: string;
  issueNumber: number;
  publisher: string;
  coverStyle: ComicCoverPalette;
  className?: string;
  aspectRatio?: string; // default "2/3"
  showSpine?: boolean;
}

export const CoverPlaceholder: React.FC<CoverPlaceholderProps> = ({
  title,
  seriesTitle,
  issueNumber,
  publisher,
  coverStyle,
  className = "",
  showSpine = true,
}) => {
  // Gera um monograma elegante a partir do título da série
  const initials = seriesTitle
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "HQ";

  return (
    <div
      className={`relative w-full aspect-[2/3] overflow-hidden select-none rounded-[10px] shadow-lg shadow-black/40 border border-white/10 transition-transform duration-300 ${className}`}
      style={{
        background: `linear-gradient(145deg, ${coverStyle.primary}, ${coverStyle.secondary})`,
      }}
      aria-label={`Capa de ${title}, edição #${issueNumber}`}
      role="img"
    >
      {/* Detalhe de textura de lombada e vinco de papel de quadrinho à esquerda */}
      {showSpine && (
        <>
          <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-gradient-to-r from-black/60 via-white/5 to-transparent z-20 pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-2 w-px bg-white/10 z-20 pointer-events-none" />
        </>
      )}

      {/* Padrões geométricos abstratos vetoriais em CSS */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {coverStyle.pattern === "cosmic" && (
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full border border-white/30 bg-radial from-white/20 to-transparent blur-[1px]" />
        )}
        {coverStyle.pattern === "cyber" && (
          <div
            className="w-full h-full"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        )}
        {coverStyle.pattern === "noir" && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-black/80" />
        )}
        {coverStyle.pattern === "geometric" && (
          <div className="absolute top-1/4 -right-10 w-48 h-48 rotate-45 border-2 border-white/15 bg-white/5" />
        )}
        {coverStyle.pattern === "vintage" && (
          <div className="absolute inset-0 border-[6px] border-amber-500/20 m-2.5 rounded-sm" />
        )}
      </div>

      {/* Reflexo sutil de verniz localizado no topo */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-black/70 pointer-events-none z-10" />

      {/* Cabeçalho da capa: Selo da editora e número da edição */}
      <div className="relative z-20 p-2.5 sm:p-3 flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] tracking-widest uppercase font-bold text-white/70 px-1 py-0.5 rounded bg-black/40 backdrop-blur-xs border border-white/10 w-fit">
            {publisher}
          </span>
          <span className="text-[10px] tracking-wider text-white/50 font-medium mt-1">
            PREMIUM ARCHIVE
          </span>
        </div>

        {/* Badge da Edição */}
        <div
          className="flex flex-col items-center justify-center min-w-7 h-7 sm:min-w-8 sm:h-8 px-1 rounded-md font-extrabold text-xs shadow-md border border-white/20"
          style={{
            backgroundColor: coverStyle.badgeBg,
            color: coverStyle.badgeText,
          }}
        >
          <span className="text-[8px] uppercase tracking-tighter leading-none opacity-80">ED.</span>
          <span className="leading-tight text-xs sm:text-sm font-black">#{issueNumber}</span>
        </div>
      </div>

      {/* Centro: Arte tipográfica e monograma estilizado */}
      <div className="relative z-20 flex flex-col items-center justify-center px-3 py-2 text-center my-auto">
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 border-white/20 shadow-inner mb-2 backdrop-blur-xs"
          style={{ backgroundColor: `${coverStyle.secondary}aa` }}
        >
          <span
            className="text-lg sm:text-xl font-black tracking-widest"
            style={{ color: coverStyle.accent }}
          >
            {initials}
          </span>
        </div>

        <div className="h-0.5 w-8 rounded-full my-1.5 opacity-60" style={{ backgroundColor: coverStyle.accent }} />

        <h3 className="font-extrabold text-white text-xs sm:text-sm leading-snug tracking-wide line-clamp-2 px-1 drop-shadow-md">
          {seriesTitle}
        </h3>
      </div>

      {/* Rodapé da capa: Título do Arco / Subtítulo */}
      <div className="relative z-20 p-2.5 sm:p-3 mt-auto bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-6">
        <p className="text-[10px] sm:text-xs text-slate-300 font-medium line-clamp-2 leading-tight">
          {title.replace(`${seriesTitle}: `, "")}
        </p>
        <div className="mt-1.5 flex items-center justify-between text-[9px] text-white/40">
          <span className="font-mono">PDF DIGITAL ARCHIVE</span>
          <span className="uppercase tracking-widest font-semibold text-amber-400/80">COL. #0{issueNumber}</span>
        </div>
      </div>
    </div>
  );
};
