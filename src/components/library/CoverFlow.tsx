import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CoverFlowItem = { id: string; title: string; image?: string; subtitle?: string };

interface Props {
  items: CoverFlowItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  onActivate?: (item: CoverFlowItem) => void;
  label: string;
  autoPlayMs?: number;
  visibleDistance?: number;
  spreadPercent?: number;
  rotationDeg?: number;
  pauseAutoPlayOnInteraction?: boolean;
}

export const CoverFlow: React.FC<Props> = ({
  items,
  activeIndex,
  onChange,
  onActivate,
  label,
  autoPlayMs,
  visibleDistance = 2,
  spreadPercent = 62,
  rotationDeg = 6,
  pauseAutoPlayOnInteraction = true,
}) => {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = items.length;
  const select = (index: number) => count && onChange((index + count) % count);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches || document.documentElement.classList.contains("reduce-motion"));
    sync();
    media.addEventListener?.("change", sync);
    window.addEventListener("biblioteca-preferences-changed", sync);
    return () => {
      media.removeEventListener?.("change", sync);
      window.removeEventListener("biblioteca-preferences-changed", sync);
    };
  }, []);

  useEffect(() => {
    if (!count) return;
    for (const offset of [-1, 0, 1]) {
      const image = items[(activeIndex + offset + count) % count]?.image;
      if (image) {
        const preload = new Image();
        preload.src = image;
      }
    }
  }, [activeIndex, count, items]);

  useEffect(() => {
    if (!autoPlayMs || autoPlayMs < 1000 || count < 2 || (pauseAutoPlayOnInteraction && (hovered || focused)) || reducedMotion || document.hidden) return;
    const id = window.setTimeout(() => select(activeIndex + 1), autoPlayMs);
    return () => window.clearTimeout(id);
  }, [activeIndex, autoPlayMs, count, hovered, focused, reducedMotion, pauseAutoPlayOnInteraction]);

  return (
    <div
      className="cover-flow"
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          select(activeIndex - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          select(activeIndex + 1);
        }
        if (event.key === "Enter" && event.target === event.currentTarget && onActivate) onActivate(items[activeIndex]);
      }}
      onPointerDown={(event) => {
        start.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (!start.current) return;
        const dx = event.clientX - start.current.x;
        const dy = event.clientY - start.current.y;
        start.current = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) select(activeIndex + (dx < 0 ? 1 : -1));
      }}
    >
      {count > 1 && (
        <button type="button" className="cover-flow-arrow previous" onClick={() => select(activeIndex - 1)} aria-label="Capa anterior">
          <ChevronLeft />
        </button>
      )}
      <div className="cover-flow-stage">
        {items.map((item, index) => {
          let distance = index - activeIndex;
          if (distance > count / 2) distance -= count;
          if (distance < -count / 2) distance += count;
          const visible = Math.abs(distance) <= visibleDistance;
          return (
            <button
              key={item.id}
              type="button"
              className={`cover-flow-card ${distance === 0 ? "active" : ""}`}
              style={{
                "--flow-x": `${distance * spreadPercent}%`,
                "--flow-x-mobile": `${distance * 92}%`,
                "--flow-z": `${Math.abs(distance) * -50}px`,
                "--flow-rotate": `${distance * -rotationDeg}deg`,
                "--flow-scale": 1.04 - Math.abs(distance) * 0.12,
                "--flow-opacity": 1 - Math.min(Math.abs(distance) * 0.35, 0.75),
                zIndex: count - Math.abs(distance),
                visibility: visible ? "visible" : "hidden",
              } as React.CSSProperties}
              aria-label={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ""}`}
              aria-current={distance === 0 ? "true" : undefined}
              tabIndex={visible ? 0 : -1}
              onClick={() => (distance === 0 ? onActivate?.(item) : select(index))}
            >
              {item.image ? <img src={item.image} alt="" loading={Math.abs(distance) <= 1 ? "eager" : "lazy"} /> : <span className="cover-flow-placeholder">{item.title}</span>}
            </button>
          );
        })}
      </div>
      {count > 1 && (
        <button type="button" className="cover-flow-arrow next" onClick={() => select(activeIndex + 1)} aria-label="Próxima capa">
          <ChevronRight />
        </button>
      )}
      {count > 1 && (
        <div className="cover-flow-dots" aria-label="Escolher destaque">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === activeIndex ? "active" : ""}
              onClick={() => select(index)}
              aria-label={`Mostrar ${item.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
