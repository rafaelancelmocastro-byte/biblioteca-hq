import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "amber" | "emerald" | "blue" | "purple" | "outline";
  size?: "sm" | "md";
  className?: string;
  id?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "sm",
  className = "",
  id,
}) => {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  const variantClasses = {
    default: "bg-slate-800/90 text-slate-300 border border-slate-700/60",
    amber: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    blue: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    purple: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
    outline: "bg-transparent text-slate-400 border border-slate-700/80",
  }[variant];

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1 font-medium rounded-md whitespace-nowrap select-none ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};
