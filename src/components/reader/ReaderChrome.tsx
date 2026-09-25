import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, GalleryHorizontal, Maximize2, Minus, Plus, Rows3, Square, SunMedium } from "lucide-react";

export type ReaderMode = "continuous" | "page" | "horizontal" | "spread";
export type ReaderTexture = "clean" | "paper" | "warm";
export type ReaderFit = "height" | "width";
export type NextIssue = { title: string; coverUrl?: string; issueNumber: number };

export function useReaderChrome(settingsOpen: boolean) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activity, setActivity] = useState(0);
  const showControls = () => { setControlsVisible(true); setActivity((value) => value + 1); };
  useEffect(() => {
    if (!controlsVisible || settingsOpen) return;
    const timer = window.setTimeout(() => setControlsVisible(false), 7000);
    return () => window.clearTimeout(timer);
  }, [activity, controlsVisible, settingsOpen]);
  useEffect(() => {
    const reveal = (event: KeyboardEvent) => { if (event.key === "Escape" && !settingsOpen) showControls(); };
    window.addEventListener("keydown", reveal);
    return () => window.removeEventListener("keydown", reveal);
  }, [settingsOpen]);
  return { controlsVisible, setControlsVisible, showControls, toggleControls: () => setControlsVisible((visible) => !visible) };
}

export function ReaderSettings({ mode, onModeChange, direction, onDirectionChange, brightness, onBrightnessChange, texture, onTextureChange, children }: {
  mode: ReaderMode; onModeChange: (mode: ReaderMode) => void;
  direction: "ltr" | "rtl"; onDirectionChange: (direction: "ltr" | "rtl") => void;
  brightness: number; onBrightnessChange: (value: number) => void;
  texture: ReaderTexture; onTextureChange: (texture: ReaderTexture) => void;
  children?: React.ReactNode;
}) {
  return <aside className="reader-settings" aria-label="Preferências de leitura">
    <div className="reader-settings-heading"><strong>Ajustes de leitura</strong><small>Personalize sua experiência</small></div>
    <div className="reader-settings-group"><span>Modo de exibição</span><div className="reader-mode-options reader-segmented">
      <button type="button" className={mode === "continuous" ? "active" : ""} aria-pressed={mode === "continuous"} onClick={() => onModeChange("continuous")}><Rows3 /> Vertical</button>
      <button type="button" className={mode === "page" ? "active" : ""} aria-pressed={mode === "page"} onClick={() => onModeChange("page")}><Square /> Página</button>
      <button type="button" className={mode === "horizontal" ? "active" : ""} aria-pressed={mode === "horizontal"} onClick={() => onModeChange("horizontal")}><GalleryHorizontal /> Horizontal</button>
      <button type="button" className={mode === "spread" ? "active" : ""} aria-pressed={mode === "spread"} onClick={() => onModeChange("spread")}><BookOpen /> Dupla</button>
    </div></div>
    <div className="reader-settings-group"><span>Sentido de leitura</span><div className="reader-mode-options reader-segmented direction-options">
      <button type="button" className={direction === "ltr" ? "active" : ""} aria-pressed={direction === "ltr"} onClick={() => onDirectionChange("ltr")}>Ocidental →</button>
      <button type="button" className={direction === "rtl" ? "active" : ""} aria-pressed={direction === "rtl"} onClick={() => onDirectionChange("rtl")}>← Mangá</button>
    </div></div>
    <div className="reader-settings-group"><label htmlFor="reader-brightness"><SunMedium /> Brilho <strong>{brightness}%</strong></label><input id="reader-brightness" type="range" min="55" max="125" value={brightness} onChange={(event) => onBrightnessChange(Number(event.target.value))} /></div>
    <div className="reader-settings-group"><span>Ambiente</span><div className="reader-mode-options reader-segmented reader-tone-options">
      {(["clean", "paper", "warm"] as ReaderTexture[]).map((option) => <button key={option} type="button" className={texture === option ? "active" : ""} aria-pressed={texture === option} onClick={() => onTextureChange(option)}>{option === "clean" ? "OLED puro" : option === "paper" ? "Papel fosco" : "Sépia"}</button>)}
    </div></div>
    {children}
  </aside>;
}

export function ReaderDock({ page, total, onPageChange, onPrevious, onNext, previousDisabled, nextDisabled, zoom, onZoomChange, fit, onFitChange, scrubDisabled = false }: {
  page: number; total: number; onPageChange: (page: number) => void;
  onPrevious: () => void; onNext: () => void; previousDisabled: boolean; nextDisabled: boolean;
  zoom: number; onZoomChange: (zoom: number) => void; fit: ReaderFit; onFitChange: (fit: ReaderFit) => void;
  scrubDisabled?: boolean;
}) {
  return <footer className="reader-dock">
    <button type="button" onClick={onPrevious} disabled={previousDisabled} aria-label="Página anterior"><ChevronLeft /></button>
    <div className="reader-page-control">
      <label htmlFor="reader-progress">Pág. <strong>{page}</strong> <span>/ {total}</span></label>
      <input id="reader-progress" type="range" min="1" max={Math.max(1, total)} value={Math.min(page, Math.max(1, total))} disabled={scrubDisabled} onChange={(event) => onPageChange(Number(event.target.value))} aria-label={`Página ${page} de ${total}`} style={{ "--reader-progress": `${total > 1 ? ((page - 1) / (total - 1)) * 100 : 0}%` } as React.CSSProperties} />
    </div>
    <button type="button" onClick={onNext} disabled={nextDisabled} aria-label="Próxima página"><ChevronRight /></button>
    <div className="reader-dock-tools">
      <div className="reader-fit" role="group" aria-label="Ajustar página">
        <button type="button" className={fit === "width" ? "active" : ""} aria-pressed={fit === "width"} onClick={() => onFitChange("width")} title="Ajustar à largura">Largura</button>
        <button type="button" className={fit === "height" ? "active" : ""} aria-pressed={fit === "height"} onClick={() => onFitChange("height")} title="Ajustar à altura"><Maximize2 /> Altura</button>
      </div>
      <div className="reader-zoom" role="group" aria-label="Zoom">
        <button type="button" onClick={() => onZoomChange(zoom - .1)} aria-label="Reduzir zoom"><Minus /></button>
        <button type="button" className="reader-reset-zoom" onClick={() => onZoomChange(1)} aria-label="Redefinir zoom para 100%">{Math.round(zoom * 100)}%</button>
        <button type="button" onClick={() => onZoomChange(zoom + .1)} aria-label="Aumentar zoom"><Plus /></button>
      </div>
    </div>
  </footer>;
}

export function ReaderCompletion({ nextIssue, onNextChapter }: { nextIssue?: NextIssue | null; onNextChapter?: () => void }) {
  return <section className="reader-completion" aria-label="Edição concluída">
    <div className="reader-completion-copy"><span>Fim da edição</span><h2>Você concluiu esta edição</h2><p>{onNextChapter ? "Sua próxima história está pronta para leitura." : "Seu progresso foi salvo. Volte ao acervo quando quiser continuar."}</p></div>
    {onNextChapter && <div className="reader-completion-next">
      {nextIssue?.coverUrl && <img src={nextIssue.coverUrl} alt="Capa da próxima edição" loading="lazy" />}
      <div><small>Próxima edição{nextIssue ? ` · #${nextIssue.issueNumber}` : ""}</small><strong>{nextIssue?.title || "Continuar a coleção"}</strong><button type="button" onClick={onNextChapter}>Ler próximo capítulo <ChevronRight /></button></div>
    </div>}
  </section>;
}
