import React, { useState, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, User, Shield, LogOut, CheckCircle2, X } from "lucide-react";
import { APP_CONFIG } from "../../config/app";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleFilters?: () => void;
  activeFiltersCount?: number;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onToggleFilters,
  activeFiltersCount = 0,
  onNavigate,
  currentPath,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Saudação de acordo com o horário local
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  return (
    <header className="h-16 border-b border-[#1e2535] bg-[#0d1017]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-3">
      {/* Esquerda: Saudação discreta */}
      <div className="flex items-center gap-3">
        {/* Logo visível no mobile */}
        <button
          onClick={() => onNavigate("/biblioteca")}
          className="md:hidden flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black text-sm shadow-md">
            HQ
          </div>
        </button>

        <div className="hidden sm:flex flex-col">
          <span className="text-xs text-slate-400 font-medium">
            {getGreeting()}, <strong className="text-slate-200 font-semibold">{APP_CONFIG.ownerName}</strong>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {APP_CONFIG.tagline}
          </span>
        </div>
      </div>

      {/* Centro: Barra de Busca com teclado ágil */}
      <div className="flex-1 max-w-md mx-2 relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por HQ, série, personagem ou autor..."
            className="w-full h-9 pl-9 pr-8 bg-[#141824] hover:bg-[#181d2c] focus:bg-[#181d2c] text-slate-200 placeholder-slate-500 text-xs sm:text-sm rounded-lg border border-slate-700/60 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
            aria-label="Buscar na biblioteca"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Direita: Botão de Filtros e Avatar do Dono */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleFilters && (
          <button
            id="header-filter-button"
            onClick={onToggleFilters}
            className={`h-9 px-3 rounded-lg border flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors ${
              activeFiltersCount > 0
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                : "bg-[#141824] hover:bg-[#1a2030] text-slate-300 border-slate-700/60"
            }`}
            aria-label="Alternar painel de filtros"
            title="Filtrar quadrinhos"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}

        {/* Menu do Usuário */}
        <div className="relative" ref={userMenuRef}>
          <button
            id="user-profile-button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 hover:border-amber-400 flex items-center justify-center text-slate-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 shadow-sm"
            aria-label="Menu do proprietário"
            aria-expanded={isUserMenuOpen}
          >
            <User className="w-4 h-4 text-amber-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#131722] border border-slate-700/80 shadow-2xl shadow-black/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    RC
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">
                      {APP_CONFIG.ownerName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {APP_CONFIG.ownerEmail}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Sessão de Proprietário Ativa</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onNavigate("/admin");
                  }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-800/60 cursor-pointer ${
                    currentPath === "/admin" ? "text-amber-400 font-semibold" : "text-slate-300"
                  }`}
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Painel de Administração</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onNavigate("/login");
                  }}
                  className="w-full text-left px-4 py-2 text-xs flex items-center gap-2.5 text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Bloquear / Tela de Login</span>
                </button>
              </div>

              <div className="px-4 pt-2 pb-1 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex justify-between">
                <span>Versão {APP_CONFIG.version}</span>
                <span className="text-amber-500/80">Privado</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
