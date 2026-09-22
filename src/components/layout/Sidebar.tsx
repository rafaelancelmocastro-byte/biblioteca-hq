import React from "react";
import {
  BookOpen,
  Clock,
  Layers,
  Heart,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app";

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  totalComicsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  totalComicsCount = 18,
}) => {
  const navItems = [
    {
      label: "Biblioteca",
      path: "/biblioteca",
      icon: BookOpen,
      badge: totalComicsCount > 0 ? String(totalComicsCount) : undefined,
    },
    {
      label: "Continuar lendo",
      path: "/continuar",
      icon: Clock,
    },
    {
      label: "Séries",
      path: "/series",
      icon: Layers,
    },
    {
      label: "Favoritos",
      path: "/favoritos",
      icon: Heart,
    },
    {
      label: "Administração",
      path: "/admin",
      icon: ShieldCheck,
      tag: "Dono",
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out border-r border-[#1e2535] bg-[#0d1017] z-30 select-none ${
        isCollapsed ? "w-20" : "w-64"
      }`}
      aria-label="Navegação Principal"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-[#1e2535] justify-between">
        <button
          onClick={() => onNavigate("/biblioteca")}
          className={`flex items-center gap-3 text-left overflow-hidden group cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 rounded-md p-1 ${
            isCollapsed ? "justify-center w-full" : ""
          }`}
          title={APP_CONFIG.name}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black text-lg shadow-md shadow-amber-500/20 flex-shrink-0">
            HQ
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-extrabold text-white text-base tracking-tight leading-none group-hover:text-amber-400 transition-colors">
                {APP_CONFIG.name}
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase mt-0.5">
                Acervo Privado
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.path}
              id={`nav-link-${item.path.replace("/", "")}`}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer relative group ${
                isActive
                  ? "bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              } ${isCollapsed ? "justify-center px-0" : ""}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                }`}
              />

              {!isCollapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                    isActive
                      ? "bg-amber-500/20 text-amber-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {!isCollapsed && item.tag && (
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800/90 text-amber-300/80 border border-amber-500/20 font-bold">
                  {item.tag}
                </span>
              )}

              {/* Indicador lateral sutil ativo */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-500 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Cloud & Archival Readiness Card */}
      {!isCollapsed && (
        <div className="p-3 mx-3 mb-3 rounded-lg bg-[#141923] border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Arquitetura Híbrida</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Preparado para Supabase & Cloudflare R2 com streaming contínuo.
          </p>
        </div>
      )}

      {/* Footer com Toggle de Recolher */}
      <div className="p-3 border-t border-[#1e2535] flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex flex-col px-1">
            <span className="text-[11px] font-medium text-slate-300 truncate">
              {APP_CONFIG.ownerName}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Dono & Curador</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
            isCollapsed ? "mx-auto" : ""
          }`}
          aria-label={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
