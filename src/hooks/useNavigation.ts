import { useEffect, useState, useCallback } from "react";

export type AppRoute =
  | { path: "/biblioteca" } | { path: "/continuar" } | { path: "/series" }
  | { path: "/guia" } | { path: "/multiverso" } | { path: "/lancamentos" }
  | { path: "/offline" } | { path: "/pagamento" } | { path: "/favoritos" }
  | { path: "/admin" } | { path: "/configuracoes" } | { path: "/preferencias" } | { path: "/login" }
  | { path: "/redefinir-senha" } | { path: "/ler"; comicId: string };

type NavigationState = { appNavigation?: true; scrollY?: number; readerDepth?: number };

function parsePath(pathname: string): { route: string; comicId?: string } {
  if (pathname === "/" || pathname === "") return { route: "/biblioteca" };
  if (pathname.startsWith("/ler/")) return { route: "/ler", comicId: pathname.slice(5) };
  const validRoutes = ["/biblioteca", "/continuar", "/series", "/guia", "/multiverso", "/lancamentos", "/offline", "/pagamento", "/favoritos", "/preferencias", "/admin", "/configuracoes", "/login", "/redefinir-senha"];
  return { route: validRoutes.includes(pathname) ? pathname : "/biblioteca" };
}

function rememberScroll() {
  const state = (window.history.state || {}) as NavigationState;
  window.history.replaceState({ ...state, appNavigation: true, scrollY: window.scrollY }, "", window.location.href);
}

export function useNavigation() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || "/biblioteca");
  const parsed = parsePath(currentPath);

  const navigate = useCallback((targetPath: string) => {
    if (targetPath === window.location.pathname + window.location.search) return;
    rememberScroll();
    window.history.pushState({ appNavigation: true, scrollY: 0 } satisfies NavigationState, "", targetPath);
    setCurrentPath(window.location.pathname);
    window.scrollTo(0, 0);
  }, []);

  const openReader = useCallback((comicId: string) => {
    const current = (window.history.state || {}) as NavigationState;
    const depth = window.location.pathname.startsWith("/ler/") ? (current.readerDepth ? current.readerDepth + 1 : 0) : 1;
    rememberScroll();
    window.history.pushState({ appNavigation: true, scrollY: 0, readerDepth: depth } satisfies NavigationState, "", `/ler/${comicId}`);
    setCurrentPath(window.location.pathname);
    window.scrollTo(0, 0);
  }, []);

  const backFromReader = useCallback(() => {
    const state = (window.history.state || {}) as NavigationState;
    if (state.readerDepth) window.history.go(-state.readerDepth);
    else navigate("/biblioteca");
  }, [navigate]);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    if (window.location.pathname === "/") window.history.replaceState(window.history.state, "", "/biblioteca");
    if (!(window.history.state as NavigationState | null)?.appNavigation) rememberScroll();

    let restoreTimer: number | undefined;
    const handlePopState = () => {
      window.clearInterval(restoreTimer);
      const targetY = ((window.history.state || {}) as NavigationState).scrollY || 0;
      setCurrentPath(window.location.pathname || "/biblioteca");
      window.scrollTo(0, 0);
      const started = Date.now();
      restoreTimer = window.setInterval(() => {
        window.scrollTo(0, targetY);
        if (Math.abs(window.scrollY - targetY) < 2 || Date.now() - started > 10000) window.clearInterval(restoreTimer);
      }, 100);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.clearInterval(restoreTimer);
      window.removeEventListener("popstate", handlePopState);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return { pathname: currentPath, activeRoute: parsed.route, comicId: parsed.comicId, navigate, openReader, backFromReader };
}
