import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt({ userId }: { userId?: string }) {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    if (!userId || window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone) return;
    const key = `biblioteca-install-seen:${userId}`;
    if (localStorage.getItem(key)) return;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIos(isIos);
    const timer = window.setTimeout(() => setVisible(true), 1800);
    const handlePrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); setVisible(true); };
    const handleInstalled = () => { localStorage.setItem(key, "installed"); setVisible(false); };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => { window.clearTimeout(timer); window.removeEventListener("beforeinstallprompt", handlePrompt); window.removeEventListener("appinstalled", handleInstalled); };
  }, [userId]);
  if (!visible || !userId) return null;
  const dismiss = () => { localStorage.setItem(`biblioteca-install-seen:${userId}`, "dismissed"); setVisible(false); };
  const install = async () => { if (installEvent) { await installEvent.prompt(); const choice = await installEvent.userChoice; if (choice.outcome === "accepted") dismiss(); } };
  return <aside className="install-prompt" role="dialog" aria-label="Instalar Biblioteca HQ"><button className="install-close" onClick={dismiss} aria-label="Fechar"><X /></button><strong>Biblioteca HQ na sua tela inicial</strong><p>{ios ? "No iPhone ou iPad, toque em Compartilhar e depois em Adicionar à Tela de Início." : installEvent ? "Instale o aplicativo para abrir sua biblioteca direto da tela inicial." : "Abra o menu do navegador e escolha Instalar aplicativo ou Adicionar à tela inicial."}</p><div>{installEvent && <button className="catalog-primary-action" onClick={() => void install()}><Download /> Instalar agora</button>}{ios && <span><Share2 /> Compartilhar → Adicionar à Tela de Início</span>}<button className="catalog-secondary-action" onClick={dismiss}>Agora não</button></div></aside>;
}
