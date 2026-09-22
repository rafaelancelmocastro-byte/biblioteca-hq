/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { LibraryPage } from "./app/pages/LibraryPage";
import { ContinuePage } from "./app/pages/ContinuePage";
import { SeriesPage } from "./app/pages/SeriesPage";
import { FavoritesPage } from "./app/pages/FavoritesPage";
import { AdminPage } from "./app/pages/AdminPage";
import { LoginPage } from "./app/pages/LoginPage";
import { useNavigation } from "./hooks/useNavigation";
import { useAuth } from "./hooks/useAuth";
import { APP_CONFIG } from "./config/app";

const ReaderPage = React.lazy(() =>
  import("./app/pages/ReaderPage").then((module) => ({ default: module.ReaderPage }))
);

export default function App() {
  const { pathname, activeRoute, comicId, navigate, openReader } = useNavigation();
  const [globalSearch, setGlobalSearch] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { session, isLoading, signOut, isSupabaseConfigured } = useAuth();
  const isOwner = session?.user.email?.toLowerCase() === APP_CONFIG.ownerEmail.toLowerCase();

  useEffect(() => {
    if (!isLoading && isSupabaseConfigured && session && activeRoute === "/admin" && !isOwner) {
      navigate("/biblioteca");
    }
  }, [activeRoute, isLoading, isOwner, isSupabaseConfigured, navigate, session]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSupabaseConfigured && !session && activeRoute !== "/login") {
    return <LoginPage onSuccess={() => navigate("/biblioteca")} />;
  }

  // Rota de Leitura Imersiva (oculta layout padrão)
  if (activeRoute === "/ler" && comicId) {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#080706] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#d95e32] border-t-transparent rounded-full animate-spin" /></div>}>
        <ReaderPage comicId={comicId} onBack={() => navigate("/biblioteca")} />
      </React.Suspense>
    );
  }

  // Rota de Login (oculta layout padrão)
  if (activeRoute === "/login") {
    return (
      <LoginPage
        onSuccess={() => navigate("/biblioteca")}
      />
    );
  }

  return (
    <AppLayout
      currentPath={pathname}
      onNavigate={navigate}
      searchQuery={globalSearch}
      onSearchChange={setGlobalSearch}
      onToggleFilters={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
      onLogout={async () => {
        await signOut();
        navigate("/login");
      }}
      isOwner={isOwner || !isSupabaseConfigured}
    >
      {activeRoute === "/biblioteca" && (
        <LibraryPage
          onOpenReader={openReader}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          isFilterDrawerOpen={isFilterDrawerOpen}
          onCloseFilterDrawer={() => setIsFilterDrawerOpen(false)}
        />
      )}

      {activeRoute === "/continuar" && (
        <ContinuePage onOpenReader={openReader} />
      )}

      {activeRoute === "/series" && (
        <SeriesPage onOpenReader={openReader} />
      )}

      {activeRoute === "/favoritos" && (
        <FavoritesPage
          onOpenReader={openReader}
          onNavigateToLibrary={() => navigate("/biblioteca")}
        />
      )}

      {activeRoute === "/admin" && (isOwner || !isSupabaseConfigured) && <AdminPage />}
    </AppLayout>
  );
}
