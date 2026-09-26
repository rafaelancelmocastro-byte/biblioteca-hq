import React, { useEffect, useState } from "react";
import { ChevronRight, MoreHorizontal, X } from "lucide-react";
import { MOBILE_PRIMARY_PATHS, NAVIGATION_ITEMS } from "./navigationItems";

interface MobileNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOwner?: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPath, onNavigate, isOwner = false }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primaryItems = NAVIGATION_ITEMS.filter((item) => MOBILE_PRIMARY_PATHS.has(item.path));
  const secondaryItems = NAVIGATION_ITEMS.filter((item) => !MOBILE_PRIMARY_PATHS.has(item.path) && (!item.ownerOnly || isOwner));
  const isSecondaryActive = secondaryItems.some((item) => item.path === currentPath);

  const handleSelect = (path: string) => {
    setIsMoreOpen(false);
    onNavigate(path);
  };

  useEffect(() => {
    if (!isMoreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setIsMoreOpen(false); };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [isMoreOpen]);

  return (
    <>
      <nav
        className="app-mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#07090e]/96 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-2xl"
        aria-label="Navegação móvel"
      >
        <div className="mx-auto grid h-[3.9rem] w-full max-w-xl grid-cols-5 items-stretch px-1.5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                id={`mobile-nav-${item.path.replace("/", "")}`}
                onClick={() => onNavigate(item.path)}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 transition-colors ${
                  isActive ? "text-white" : "text-neutral-500 hover:text-neutral-200"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon strokeWidth={isActive ? 2 : 1.7} className="h-[18px] w-[18px] shrink-0" />
                <span className="max-w-full truncate text-center text-[9px] font-medium leading-tight tracking-tight sm:text-[10px]">
                  {item.label}
                </span>
                {isActive && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-white/85" aria-hidden="true" />}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 transition-colors ${
              isMoreOpen || isSecondaryActive ? "text-white" : "text-neutral-500 hover:text-neutral-200"
            }`}
            aria-label="Mais opções de navegação"
            aria-expanded={isMoreOpen}
          >
            <MoreHorizontal strokeWidth={1.8} className="h-[18px] w-[18px]" />
            <span className="text-[9px] font-medium leading-tight sm:text-[10px]">Mais</span>
            {(isMoreOpen || isSecondaryActive) && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-white/85" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/65 backdrop-blur-sm" role="presentation">
          <button className="absolute inset-0 cursor-default" onClick={() => setIsMoreOpen(false)} aria-label="Fechar menu" />
          <section
            className="relative z-10 w-full max-h-[78dvh] overflow-y-auto rounded-t-[1.6rem] border-t border-white/10 bg-[#0b0e14] px-4 pt-4 shadow-[0_-18px_50px_rgba(0,0,0,.55)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6"
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções de navegação"
          >
            <div className="mb-2 flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Biblioteca HQ</span>
                <h2 className="mt-0.5 text-sm font-bold tracking-tight text-white">Mais opções</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className={`flex w-full min-w-0 items-center gap-3 py-3.5 text-left transition-colors ${
                      isActive ? "text-white" : "text-neutral-300 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-white/[0.10] text-white" : "text-neutral-500"
                    }`}>
                      <Icon strokeWidth={1.7} className="h-[17px] w-[17px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{item.label}</span>
                      {item.description && <span className="mt-0.5 block truncate text-[10.5px] text-neutral-500">{item.description}</span>}
                    </span>
                    {isActive ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" aria-label="Página atual" />
                    ) : (
                      <ChevronRight strokeWidth={1.6} className="h-4 w-4 shrink-0 text-neutral-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
};
