import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { InstallPrompt } from "./InstallPrompt";

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleFilters?: () => void;
  activeFiltersCount?: number;
  totalComicsCount?: number;
  hideHeaderAndNav?: boolean; // Para modo de leitura imersivo ou login
  onLogout?: () => void | Promise<void>;
  isOwner?: boolean;
  userName?: string;
  userId?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  searchQuery,
  onSearchChange,
  onToggleFilters,
  activeFiltersCount = 0,
  totalComicsCount = 0,
  hideHeaderAndNav = false,
  onLogout,
  isOwner = false,
  userName = "Leitor",
  userId,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("biblioteca-hq-sidebar-collapsed") === "true");
  const toggleSidebar = () => setIsSidebarCollapsed((current) => { const next = !current; localStorage.setItem("biblioteca-hq-sidebar-collapsed", String(next)); return next; });

  if (hideHeaderAndNav) {
    return <div className="min-h-screen bg-[#0b0e14] text-slate-100">{children}</div>;
  }

  return (
    <div className="app-shell min-h-screen flex text-slate-100 overflow-x-hidden">
      {/* Sidebar Desktop/Tablet */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        totalComicsCount={totalComicsCount}
        isOwner={isOwner}
        userName={userName}
      />

      {/* Conteúdo Principal com Header e Scroll independente */}
      <div className="flex-1 flex flex-col min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
        <Header
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onToggleFilters={onToggleFilters}
          activeFiltersCount={activeFiltersCount}
          onNavigate={onNavigate}
          currentPath={currentPath}
          onLogout={onLogout}
          isOwner={isOwner}
          userName={userName}
        />

        <main className="cinematic-main flex-1 px-4 sm:px-6 lg:px-9 py-5 sm:py-7 max-w-[1680px] w-full mx-auto">
          {children}
        </main>

        {/* Mobile Navigation bar */}
        <MobileNav currentPath={currentPath} onNavigate={onNavigate} isOwner={isOwner} />
        <InstallPrompt userId={userId} />
      </div>
    </div>
  );
};
