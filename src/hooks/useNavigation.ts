import { useEffect, useState, useCallback } from "react";

export type AppRoute =
  | { path: "/biblioteca" }
  | { path: "/continuar" }
  | { path: "/series" }
  | { path: "/favoritos" }
  | { path: "/admin" }
  | { path: "/login" }
  | { path: "/ler"; comicId: string };

function parsePath(pathname: string): { route: string; comicId?: string } {
  // Trata redirecionamento da raiz / para /biblioteca
  if (pathname === "/" || pathname === "") {
    return { route: "/biblioteca" };
  }

  if (pathname.startsWith("/ler/")) {
    const id = pathname.replace("/ler/", "");
    return { route: "/ler", comicId: id };
  }

  // Rotas normais
  const validRoutes = ["/biblioteca", "/continuar", "/series", "/favoritos", "/admin", "/login"];
  if (validRoutes.includes(pathname)) {
    return { route: pathname };
  }

  // Fallback padrão seguro
  return { route: "/biblioteca" };
}

export function useNavigation() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      return p === "/" || p === "" ? "/biblioteca" : p;
    }
    return "/biblioteca";
  });

  const parsed = parsePath(currentPath);

  const navigate = useCallback((targetPath: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", targetPath);
      setCurrentPath(targetPath);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const openReader = useCallback((comicId: string) => {
    navigate(`/ler/${comicId}`);
  }, [navigate]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || "/biblioteca");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Se estiver na raiz /, sincroniza no histórico
  useEffect(() => {
    if (typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "")) {
      window.history.replaceState({}, "", "/biblioteca");
    }
  }, []);

  return {
    pathname: currentPath,
    activeRoute: parsed.route,
    comicId: parsed.comicId,
    navigate,
    openReader,
  };
}
