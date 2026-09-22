/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { LibraryPage } from "./app/pages/LibraryPage";
import { ContinuePage } from "./app/pages/ContinuePage";
import { SeriesPage } from "./app/pages/SeriesPage";
import { FavoritesPage } from "./app/pages/FavoritesPage";
import { AdminPage } from "./app/pages/AdminPage";
import { ReaderPage } from "./app/pages/ReaderPage";
import { LoginPage } from "./app/pages/LoginPage";
import { useNavigation } from "./hooks/useNavigation";

export default function App() {
  const { pathname, activeRoute, comicId, navigate, openReader } = useNavigation();
  const [globalSearch, setGlobalSearch] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Rota de Leitura Imersiva (oculta layout padrão)
  if (activeRoute === "/ler" && comicId) {
    return (
      <ReaderPage
        comicId={comicId}
        onBack={() => navigate("/biblioteca")}
      />
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

      {activeRoute === "/admin" && <AdminPage />}
    </AppLayout>
  );
}
