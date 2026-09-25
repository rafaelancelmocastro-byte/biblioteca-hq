/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { LibraryPage } from "./app/pages/LibraryPage";
import { LoginPage } from "./app/pages/LoginPage";
import { useNavigation } from "./hooks/useNavigation";
import { useAuth } from "./hooks/useAuth";
import { CheckoutPage } from "./app/pages/CheckoutPage";
import { PasswordResetPage } from "./app/pages/PasswordResetPage";
import { flushReadingProgress } from "./services/offlineProgress";

const legacyRecoveryLink = /(?:[?&#])type=recovery(?:[&#]|$)/.test(window.location.search + window.location.hash);

const ContinuePage = React.lazy(() => import("./app/pages/ContinuePage").then((module) => ({ default: module.ContinuePage })));
const SeriesPage = React.lazy(() => import("./app/pages/SeriesPage").then((module) => ({ default: module.SeriesPage })));
const IndieMangaPage = React.lazy(() => import("./app/pages/IndieMangaPage").then((module) => ({ default: module.IndieMangaPage })));
const FavoritesPage = React.lazy(() => import("./app/pages/FavoritesPage").then((module) => ({ default: module.FavoritesPage })));
const LaunchesPage = React.lazy(() => import("./app/pages/LaunchesPage").then((module) => ({ default: module.LaunchesPage })));
const OfflinePage = React.lazy(() => import("./app/pages/OfflinePage").then((module) => ({ default: module.OfflinePage })));
const ReadingGuidePage = React.lazy(() => import("./app/pages/ReadingGuidePage").then((module) => ({ default: module.ReadingGuidePage })));
const ReaderPage = React.lazy(() =>
  import("./app/pages/ReaderPage").then((module) => ({ default: module.ReaderPage }))
);
const AdminPage = React.lazy(() => import("./app/pages/AdminPage").then((module) => ({ default: module.AdminPage })));

export default function App() {
  const { pathname, activeRoute, comicId, navigate, openReader, backFromReader } = useNavigation();
  const [globalSearch, setGlobalSearch] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { session, profile, isLoading, signOut, isSupabaseConfigured } = useAuth();
  const isOwner = profile?.role === "master" && profile.is_active;
  const canRead = isOwner || (profile?.access_status === "lifetime" && profile.is_active);
  const [restrictedNotice, setRestrictedNotice] = useState(false);
  const [legacyRecoveryHandled, setLegacyRecoveryHandled] = useState(false);
  useEffect(() => { if (!restrictedNotice) return; const timer = window.setTimeout(() => setRestrictedNotice(false), 4000); return () => window.clearTimeout(timer); }, [restrictedNotice]);
  useEffect(() => { if (!session?.user.id) return; const sync = () => { void flushReadingProgress(session.user.id); }; window.addEventListener("online", sync); sync(); return () => window.removeEventListener("online", sync); }, [session?.user.id]);

  useEffect(() => {
    if (!isLoading && isSupabaseConfigured && session && (activeRoute === "/admin" || activeRoute === "/configuracoes") && !isOwner) {
      setRestrictedNotice(true);
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

  if (activeRoute === "/redefinir-senha" || (activeRoute === "/login" && legacyRecoveryLink && !legacyRecoveryHandled)) return <PasswordResetPage onLogin={() => { setLegacyRecoveryHandled(true); navigate("/login"); }} />;

  if (isSupabaseConfigured && session && !profile) return <div className="login-screen min-h-dvh flex items-center justify-center p-4"><div className="login-card max-w-md rounded-3xl p-6 text-center"><h1 className="text-xl font-bold">Não foi possível verificar seu acesso</h1><p className="mt-3 text-sm text-slate-300">Confira sua conexão e tente novamente. Nenhum pagamento é necessário enquanto esta verificação estiver indisponível.</p><button className="studio-primary mt-5" onClick={() => window.location.reload()}>Tentar novamente</button></div></div>;

  if (isSupabaseConfigured && session && !canRead) return <CheckoutPage email={session.user.email || ""} blocked={profile?.access_status === "blocked"} onBack={() => { void signOut().then(() => navigate("/login")); }} />;

  if (isSupabaseConfigured && !session && activeRoute !== "/login") {
    return <LoginPage onSuccess={() => navigate("/biblioteca")} />;
  }

  // Rota de Leitura Imersiva (oculta layout padrão)
  if (activeRoute === "/ler" && comicId) {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#05090f] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#526d8a] border-t-transparent rounded-full animate-spin" /></div>}>
        <ReaderPage comicId={comicId} onBack={backFromReader} onOpenReader={openReader} />
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

  if (activeRoute === "/pagamento") return <div className="login-screen min-h-dvh flex items-center justify-center p-4"><div className="login-card max-w-md rounded-3xl p-6 text-center"><h1 className="text-2xl font-bold">Acesso já liberado</h1><p className="mt-3 text-sm text-slate-300">Sua conta já pode ler o acervo. Não é necessário fazer outro PIX.</p><button className="studio-primary mt-5" onClick={() => navigate("/biblioteca")}>Ir para a biblioteca</button></div></div>;

  return (
    <AppLayout
      currentPath={pathname}
      onNavigate={navigate}
      searchQuery={globalSearch}
      onSearchChange={(query) => { setGlobalSearch(query); if (query && activeRoute !== "/biblioteca") navigate("/biblioteca"); }}
      onToggleFilters={activeRoute === "/biblioteca" ? () => setIsFilterDrawerOpen(!isFilterDrawerOpen) : undefined}
      onLogout={async () => {
        await signOut();
        navigate("/login");
      }}
      isOwner={isOwner || !isSupabaseConfigured}
      userName={isOwner ? "Rafael Castro" : profile?.email?.split("@")[0] || "Leitor"}
      userId={session?.user.id}
    >
      {restrictedNotice && <div role="alert" className="fixed top-20 right-4 z-50 rounded-xl bg-[#1d2835] border border-amber-400/40 px-4 py-3 text-sm text-amber-200 shadow-xl" onClick={() => setRestrictedNotice(false)}>Acesso restrito</div>}
      <React.Suspense fallback={<div className="studio-panel" role="status">Carregando página...</div>}>
      {activeRoute === "/biblioteca" && (
        <LibraryPage
          onOpenReader={openReader}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          isFilterDrawerOpen={isFilterDrawerOpen}
          onCloseFilterDrawer={() => setIsFilterDrawerOpen(false)}
          onToggleFilterDrawer={() => setIsFilterDrawerOpen((prev) => !prev)}
          onOpenGuide={() => navigate("/guia")}
          onOpenLaunches={() => navigate("/lancamentos")}
        />
      )}

      {activeRoute === "/continuar" && (
        <ContinuePage onOpenReader={openReader} />
      )}

      {activeRoute === "/series" && (
        <SeriesPage onOpenReader={openReader} />
      )}
      {activeRoute === "/guia" && <ReadingGuidePage onOpenReader={openReader} />}
      {activeRoute === "/lancamentos" && <LaunchesPage onOpenReader={openReader} />}
      {activeRoute === "/offline" && <OfflinePage userId={session?.user.id || ""} onOpenReader={openReader} />}
      {activeRoute === "/multiverso" && <IndieMangaPage onOpenReader={openReader} />}

      {activeRoute === "/favoritos" && (
        <FavoritesPage
          onOpenReader={openReader}
          onNavigateToLibrary={() => navigate("/biblioteca")}
          onNavigateToSeries={(seriesId) => navigate(`/series?series=${encodeURIComponent(seriesId)}`)}
        />
      )}

      {(activeRoute === "/admin" || activeRoute === "/configuracoes") && (isOwner || !isSupabaseConfigured) && <AdminPage />}
      </React.Suspense>
    </AppLayout>
  );
}
