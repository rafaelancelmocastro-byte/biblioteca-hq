import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

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
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  searchQuery,
  onSearchChange,
  onToggleFilters,
  activeFiltersCount = 0,
  totalComicsCount = 18,
  hideHeaderAndNav = false,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (hideHeaderAndNav) {
    return <div className="min-h-screen bg-[#0b0e14] text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen flex bg-[#0b0e14] text-slate-100 overflow-x-hidden">
      {/* Sidebar Desktop/Tablet */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        totalComicsCount={totalComicsCount}
      />

      {/* Conteúdo Principal com Header e Scroll independente */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Header
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onToggleFilters={onToggleFilters}
          activeFiltersCount={activeFiltersCount}
          onNavigate={onNavigate}
          currentPath={currentPath}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Navigation bar */}
        <MobileNav currentPath={currentPath} onNavigate={onNavigate} />
      </div>
    </div>
  );
};
