import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      className = "",
      disabled,
      isLoading,
      type = "button",
      id,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-xs sm:text-sm gap-2",
      lg: "h-11 px-5 text-sm sm:text-base gap-2.5",
      icon: "h-9 w-9 p-0 justify-center",
    }[size];

    const variantClasses = {
      primary:
        "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-semibold shadow-md shadow-amber-500/20 border border-amber-400/30",
      secondary:
        "bg-[#1c2230] hover:bg-[#252d40] active:bg-[#161a26] text-slate-200 border border-slate-700/60 font-medium",
      ghost:
        "bg-transparent hover:bg-white/5 active:bg-white/10 text-slate-300 hover:text-white border border-transparent",
      outline:
        "bg-transparent hover:bg-slate-800/60 active:bg-slate-800 text-slate-300 border border-slate-700 font-medium",
      danger:
        "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-medium",
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        id={id}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-amber-400 focus-visible:outline-offset-2 select-none ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
