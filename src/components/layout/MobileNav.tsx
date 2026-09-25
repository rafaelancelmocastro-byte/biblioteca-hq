import React, { useState } from "react";
import {
  BookOpen,
  Clock,
  Layers,
  Heart,
  ShieldCheck,
  Compass,
  Sparkles,
  HardDriveDownload,
  MoreHorizontal,
  X,
  ChevronRight,
} from "lucide-react";

interface MobileNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOwner?: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPath, onNavigate, isOwner = false }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // 4 itens primários essenciais com rótulos compactos e objetivos (nunca cortam em telas pequenas)
  const primaryItems = [
    { label: "Acervo", path: "/biblioteca", icon: BookOpen },
    { label: "Lendo", path: "/continuar", icon: Clock },
    { label: "Séries", path: "/series", icon: Layers },
    { label: "Favoritos", path: "/favoritos", icon: Heart },
  ];

  // Itens secundários acessíveis via gaveta "Mais" no estilo Apple TV+
  const secondaryItems = [
    { label: "Lançamentos", path: "/lancamentos", icon: Sparkles, description: "Edições e volumes recém-chegados" },
    { label: "Mangás & Indie", path: "/multiverso", icon: Compass, description: "Obras orientais e independentes" },
    { label: "Guia de Leitura", path: "/guia", icon: Compass, description: "Ordem cronológica e sagas" },
    { label: "Baixados Offline", path: "/offline", icon: HardDriveDownload, description: "HQs disponíveis sem conexão" },
    ...(isOwner
      ? [{ label: "Gerenciar Acervo", path: "/configuracoes", icon: ShieldCheck, description: "Configurações e painel do acervo" }]
      : []),
  ];

  const isSecondaryActive = secondaryItems.some((item) => item.path === currentPath);

  const handleSelect = (path: string) => {
    setIsMoreOpen(false);
    onNavigate(path);
  };

  return (
    <>
      {/* Barra de Navegação Inferior Fixa com altura dinâmica que respeita safe-area */}
      <nav
        className="app-mobile-nav md:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom,0px)] bg-[#07090e]/95 backdrop-blur-3xl border-t border-white/[0.09] shadow-[0_-12px_40px_rgba(0,0,0,0.85)]"
        aria-label="Navegação móvel"
      >
        <div className="grid grid-cols-5 h-[3.85rem] w-full max-w-lg mx-auto items-center px-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <button
                key={item.path}
                id={`mobile-nav-${item.path.replace("/", "")}`}
                onClick={() => onNavigate(item.path)}
                className={`flex flex-col items-center justify-center h-full py-1 cursor-pointer transition-all relative ${
                  isActive ? "text-white font-bold" : "text-neutral-400 hover:text-neutral-200"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={`w-4 h-4 mb-0.5 transition-transform ${isActive ? "scale-110 text-white" : ""}`} />
                <span className="text-[10px] font-semibold tracking-tight truncate max-w-full px-0.5">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white] mt-0.5" />
                )}
              </button>
            );
          })}

          {/* Botão "Mais" */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center h-full py-1 cursor-pointer transition-all relative ${
              isMoreOpen || isSecondaryActive ? "text-white font-bold" : "text-neutral-400 hover:text-neutral-200"
            }`}
            aria-label="Mais opções de navegação"
            aria-expanded={isMoreOpen}
          >
            <MoreHorizontal className={`w-4 h-4 mb-0.5 transition-transform ${isSecondaryActive ? "scale-110 text-blue-400" : ""}`} />
            <span className="text-[10px] font-semibold tracking-tight">Mais</span>
            {isSecondaryActive && (
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)] mt-0.5" />
            )}
          </button>
        </div>
      </nav>

      {/* Gaveta Deslizante "Mais" (Sheet em Vidro Fosco Apple TV+) */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-[#0c0f16]/98 backdrop-blur-3xl border-t border-white/12 rounded-t-3xl p-5 shadow-2xl z-10 max-h-[82vh] overflow-y-auto pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-3.5">
              <span className="text-sm font-bold text-white tracking-tight">Navegação & Coleções</span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left cursor-pointer border ${
                      isActive
                        ? "bg-white/[0.12] text-white font-semibold border-white/20 shadow-md"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-white text-black" : "bg-white/10 text-neutral-200"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{item.label}</span>
                        <span className="text-[10.5px] text-neutral-400 truncate">{item.description}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
