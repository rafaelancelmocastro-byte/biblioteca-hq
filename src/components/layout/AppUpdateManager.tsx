import { useEffect, useState } from "react";

export function AppUpdateManager() {
  const [updateReady, setUpdateReady] = useState(false);
  const [pullReady, setPullReady] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    let disposed = false;
    let refreshing = false;
    const hadController = !!navigator.serviceWorker.controller;
    const safeToReload = () => !/^\/(ler|admin|configuracoes)(\/|$)/.test(location.pathname) && !document.querySelector("input:focus,textarea:focus,select:focus");
    const onControllerChange = () => {
      if (disposed || !hadController || refreshing) return;
      if (safeToReload()) { refreshing = true; location.reload(); }
      else setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    let registration: ServiceWorkerRegistration | undefined;
    const check = () => { if (navigator.onLine) void registration?.update().catch(() => {}); };
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((value) => { registration = value; check(); }).catch(() => {});
    const timer = window.setInterval(check, 5 * 60 * 1000);
    const onVisibility = () => { if (document.visibilityState === "visible" && !/^\/(ler|admin|configuracoes)(\/|$)/.test(location.pathname)) check(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", check);
    return () => { disposed = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("online", check); navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange); };
  }, []);

  useEffect(() => {
    let startY = 0;
    let startX = 0;
    let canPull = false;
    const start = (event: TouchEvent) => {
      canPull = !/^\/(ler|admin|configuracoes)(\/|$)/.test(location.pathname) && window.scrollY <= 2 && !((event.target as HTMLElement).closest("input,textarea,select,[contenteditable=true],.reader-shell"));
      startY = event.touches[0]?.clientY || 0;
      startX = event.touches[0]?.clientX || 0;
    };
    const move = (event: TouchEvent) => {
      if (!canPull) return;
      const touch = event.touches[0];
      setPullReady(!!touch && touch.clientY - startY > 100 && Math.abs(touch.clientX - startX) < 60);
    };
    const end = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const shouldReload = canPull && !/^\/(ler|admin|configuracoes)(\/|$)/.test(location.pathname) && !!touch && touch.clientY - startY > 100 && Math.abs(touch.clientX - startX) < 60;
      setPullReady(false);
      canPull = false;
      if (shouldReload) location.reload();
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end, { passive: true });
    return () => { document.removeEventListener("touchstart", start); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", end); };
  }, []);

  return <>{pullReady && <div className="app-refresh-pull" role="status">Solte para atualizar</div>}{updateReady && <div className="app-update-banner" role="status"><span>Nova versão da Biblioteca HQ disponível.</span><button onClick={() => location.reload()}>Atualizar agora</button></div>}</>;
}
