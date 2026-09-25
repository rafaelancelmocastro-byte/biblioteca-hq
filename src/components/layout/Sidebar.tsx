import React from "react";
import {
  BookOpen,
  Clock,
  Layers,
  Heart,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  Sparkles,
  HardDriveDownload,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app";
import { BrandLogo } from "../ui/BrandLogo";

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  totalComicsCount?: number;
  isOwner?: boolean;
  userName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  totalComicsCount = 0,
  isOwner = false,
}) => {
  // Nomenclaturas alinhadas ao padrão de streaming Apple TV+
  const navItems = [
    {
      label: "Biblioteca",
      path: "/biblioteca",
      icon: BookOpen,
      badge: totalComicsCount > 0 ? String(totalComicsCount) : undefined,
      section: "Explorar",
    },
    { label: "Lançamentos", path: "/lancamentos", icon: Sparkles },
    { label: "Séries & Sagas", path: "/series", icon: Layers },
    { label: "Mangás & Indie", path: "/multiverso", icon: Compass },
    { label: "Guia de Leitura", path: "/guia", icon: Compass },
    {
      label: "Continuar Lendo",
      path: "/continuar",
      icon: Clock,
      section: "Sua Coleção",
    },
    { label: "Favoritos", path: "/favoritos", icon: Heart },
    { label: "Baixados Offline", path: "/offline", icon: HardDriveDownload },
    {
      label: "Configurações",
      path: "/configuracoes",
      icon: ShieldCheck,
      tag: "Dono",
      ownerOnly: true,
      section: "Gestão",
    },
  ];

  return (
    <aside
      className={`app-sidebar hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out z-30 select-none bg-[#06080d]/90 backdrop-blur-3xl border-r border-white/[0.08] ${
        isCollapsed ? "w-[4.5rem]" : "w-64"
      }`}
      aria-label="Navegação Principal"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-3.5 border-b border-white/[0.08] justify-between flex-shrink-0">
        <button
          onClick={() => onNavigate("/biblioteca")}
          className={`flex items-center gap-3 text-left overflow-hidden group cursor-pointer focus-visible:outline-2 focus-visible:outline-white/40 rounded-xl p-1.5 transition-colors ${
            isCollapsed ? "justify-center w-full" : ""
          }`}
          title={APP_CONFIG.name}
        >
          <BrandLogo compact className="sidebar-brand-mark shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-white text-sm tracking-tight leading-none group-hover:text-blue-300 transition-colors truncate">
                {APP_CONFIG.name}
              </span>
              <span className="text-[9.5px] text-neutral-400 tracking-wider font-semibold uppercase mt-1 truncate">
                Streaming de HQs
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`sidebar-collapse-toggle flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer ${
            isCollapsed ? "mx-auto justify-center" : "ml-auto"
          }`}
          aria-label={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <span className="text-[11px] font-medium">Recolher</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Navigation Links com scroll invisível para evitar barras cortando texto ou badges */}
      <nav className="sidebar-nav flex-1 px-2.5 py-2 overflow-y-auto space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems
          .filter((item) => !item.ownerOnly || isOwner)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <React.Fragment key={item.path}>
                {item.section && !isCollapsed && (
                  <span className="sidebar-section-label block px-3 pt-3.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    {item.section}
                  </span>
                )}
                <button
                  id={`nav-link-${item.path.replace("/", "")}`}
                  onClick={() => onNavigate(item.path)}
                  className={`sidebar-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer relative group ${
                    isActive
                      ? "bg-white/[0.12] text-white font-semibold border border-white/[0.16] shadow-[0_2px_12px_rgba(255,255,255,0.06)]"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                  } ${isCollapsed ? "justify-center px-0 h-11" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate text-xs font-semibold leading-normal min-w-0">
                      {item.label}
                    </span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono bg-white/10 text-neutral-300 border border-white/10 shrink-0 ml-auto">
                      {item.badge}
                    </span>
                  )}

                  {!isCollapsed && item.tag && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0 ml-auto">
                      {item.tag}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
      </nav>
    </aside>
  );
};
