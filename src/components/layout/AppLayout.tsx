import React, { useEffect, useState } from "react";
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

type AppDeviceLayout = "desktop" | "tablet" | "mobile";

const detectDeviceLayout = (): AppDeviceLayout => {
  if (typeof window === "undefined") return "desktop";

  const screenWidth = window.screen?.width || window.innerWidth;
  const screenHeight = window.screen?.height || window.innerHeight;
  const shortSide = Math.min(screenWidth, screenHeight);
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const touchCapable = navigator.maxTouchPoints > 0;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  if (!(coarsePointer || touchCapable || mobileUa || standalone) || shortSide > 1024) {
    return "desktop";
  }

  return shortSide <= 600 ? "mobile" : "tablet";
};

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
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [deviceLayout, setDeviceLayout] = useState<AppDeviceLayout>(() => detectDeviceLayout());
  const forceTouchLayout = deviceLayout !== "desktop";

  const toggleSidebar = () => setIsSidebarCollapsed((current) => {
    const next = !current;
    localStorage.setItem("biblioteca-hq-sidebar-collapsed", String(next));
    return next;
  });

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  useEffect(() => {
    const refreshDeviceLayout = () => {
      const nextLayout = detectDeviceLayout();
      setDeviceLayout(nextLayout);

      const html = document.documentElement;
      html.dataset.appDevice = nextLayout;

      const screenWidth = window.screen?.width || window.innerWidth;
      const ratio = screenWidth > 0 ? window.innerWidth / screenWidth : 1;
      const shouldCompensateDesktopViewport =
        nextLayout !== "desktop" &&
        ratio >= 1.18 &&
        ratio <= 3.5;

      if (shouldCompensateDesktopViewport) {
        html.dataset.desktopViewport = "true";
        html.style.setProperty("--app-desktop-scale", String(ratio));
        html.style.setProperty("--app-compensated-width", `${100 / ratio}%`);
      } else {
        delete html.dataset.desktopViewport;
        html.style.removeProperty("--app-desktop-scale");
        html.style.removeProperty("--app-compensated-width");
      }
    };

    refreshDeviceLayout();

    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshDeviceLayout();
    };

    window.addEventListener("resize", refreshDeviceLayout);
    window.addEventListener("orientationchange", refreshDeviceLayout);
    window.addEventListener("pageshow", refreshDeviceLayout);
    document.addEventListener("visibilitychange", handleVisibility);
    coarseQuery.addEventListener?.("change", refreshDeviceLayout);
    standaloneQuery.addEventListener?.("change", refreshDeviceLayout);

    return () => {
      window.removeEventListener("resize", refreshDeviceLayout);
      window.removeEventListener("orientationchange", refreshDeviceLayout);
      window.removeEventListener("pageshow", refreshDeviceLayout);
      document.removeEventListener("visibilitychange", handleVisibility);
      coarseQuery.removeEventListener?.("change", refreshDeviceLayout);
      standaloneQuery.removeEventListener?.("change", refreshDeviceLayout);
    };
  }, []);

  if (hideHeaderAndNav) {
    return <div className="min-h-screen bg-[#0b0e14] text-slate-100">{children}</div>;
  }

  return (
    <div className={`app-shell min-h-screen flex text-slate-100 overflow-x-hidden ${forceTouchLayout ? "app-touch-layout" : ""}`}>
      {!forceTouchLayout && (
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          totalComicsCount={totalComicsCount}
          isOwner={isOwner}
          userName={userName}
        />
      )}

      <div
        className={`flex-1 flex flex-col min-w-0 ${forceTouchLayout
          ? "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
          : "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-8"}`}
      >
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
          forceTouchLayout={forceTouchLayout}
        />

        {!isOnline && (
          <div className="border-b border-white/[0.08] bg-white/[0.035] px-4 py-2.5 sm:px-6">
            <div className="mx-auto flex max-w-[1680px] flex-col gap-2 text-xs text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
              <span>Você está offline. O app continua disponível e as edições salvas neste dispositivo podem ser lidas normalmente.</span>
              <button type="button" onClick={() => onNavigate("/offline")} className="w-fit font-semibold text-white hover:text-neutral-300">
                Ver baixados offline
              </button>
            </div>
          </div>
        )}

        <main className={`cinematic-main flex-1 py-5 w-full mx-auto ${forceTouchLayout ? "px-4 max-w-none" : "px-4 sm:px-6 lg:px-9 max-w-[1680px]"}`}>
          {children}
        </main>

        <MobileNav
          currentPath={currentPath}
          onNavigate={onNavigate}
          isOwner={isOwner}
          forceVisible={forceTouchLayout}
        />
        <InstallPrompt userId={userId} />
      </div>
    </div>
  );
};
