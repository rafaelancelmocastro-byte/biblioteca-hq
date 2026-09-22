import React from "react";
import { BookOpen, Clock, Layers, Heart, Shield } from "lucide-react";

interface MobileNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOwner?: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPath, onNavigate, isOwner = false }) => {
  const items = [
    {
      label: "Biblioteca",
      path: "/biblioteca",
      icon: BookOpen,
    },
    {
      label: "Continuar",
      path: "/continuar",
      icon: Clock,
    },
    {
      label: "Coleções",
      path: "/series",
      icon: Layers,
    },
    {
      label: "Favoritos",
      path: "/favoritos",
      icon: Heart,
    },
    {
      label: "Ajustes",
      path: "/configuracoes",
      icon: Shield,
      ownerOnly: true,
    },
  ];

  return (
    <nav
      className="app-mobile-nav md:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)] shadow-lg"
      aria-label="Navegação móvel"
    >
      <div className={`grid ${isOwner ? "grid-cols-5" : "grid-cols-4"} h-16 max-w-lg mx-auto`}>
        {items.filter((item) => !item.ownerOnly || isOwner).map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.path}
              id={`mobile-nav-${item.path.replace("/", "")}`}
              onClick={() => onNavigate(item.path)}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 cursor-pointer transition-colors relative ${
                isActive ? "text-amber-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
