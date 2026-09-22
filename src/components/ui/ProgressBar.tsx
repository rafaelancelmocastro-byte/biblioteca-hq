import React from "react";
import { ComicStatus } from "../../types/comic";

interface ProgressBarProps {
  percentage: number;
  status?: ComicStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  status = "reading",
  size = "sm",
  showLabel = false,
  className = "",
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  const heightClass = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-2.5",
  }[size];

  const colorClass =
    clamped >= 100 || status === "completed"
      ? "bg-emerald-500 shadow-emerald-500/30"
      : clamped > 0 || status === "reading"
      ? "bg-amber-500 shadow-amber-500/30"
      : "bg-slate-600";

  return (
    <div className={`w-full flex items-center gap-2 ${className}`}>
      <div
        className={`w-full ${heightClass} bg-slate-800/80 rounded-full overflow-hidden border border-white/5 relative`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso: ${clamped}%`}
      >
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-300 shadow-xs`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-medium text-slate-400 tabular-nums min-w-[28px] text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
};
