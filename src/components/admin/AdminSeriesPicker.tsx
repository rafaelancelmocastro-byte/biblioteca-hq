import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Series } from "../../types/comic";

const fold = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

const pathLabel = (item: Series, all: Series[]) =>
  `${item.publisher} → ${item.parentSeriesId ? `${all.find((parent) => parent.id === item.parentSeriesId)?.title || "Coleção"} → ` : ""}${item.title}`;

export function AdminSeriesPicker({
  series,
  value,
  onChange,
  required = false,
  placeholder = "Buscar coleção, saga ou editora...",
}: {
  series: Series[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const selected = series.find((item) => item.id === value);
  const [query, setQuery] = useState(selected ? pathLabel(selected, series) : "");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) setQuery(selected ? pathLabel(selected, series) : "");
  }, [open, selected?.id, series]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const options = useMemo(() => {
    const needle = fold(query.trim());
    const ranked = series.filter((item) => {
      if (!needle || (selected && query === pathLabel(selected, series))) return true;
      return fold(pathLabel(item, series)).includes(needle);
    });
    return ranked.slice(0, 40);
  }, [query, selected?.id, series]);

  return (
    <div ref={root} className="admin-series-picker">
      <div className="admin-series-picker-input">
        <Search aria-hidden="true" />
        <input
          className="admin-field"
          type="search"
          value={query}
          required={required && !value}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            if (selected && query === pathLabel(selected, series)) setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          aria-label="Buscar coleção ou saga"
          autoComplete="off"
        />
        {(value || query) && (
          <button
            type="button"
            aria-label="Limpar coleção selecionada"
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(true);
            }}
          >
            <X />
          </button>
        )}
      </div>
      {open && (
        <div className="admin-series-picker-options" role="listbox">
          {options.length ? options.map((item) => (
            <button
              type="button"
              key={item.id}
              role="option"
              aria-selected={item.id === value}
              onClick={() => {
                onChange(item.id);
                setQuery(pathLabel(item, series));
                setOpen(false);
              }}
            >
              <strong>{item.title}</strong>
              <span>{item.publisher}{item.parentSeriesId ? ` · ${series.find((parent) => parent.id === item.parentSeriesId)?.title || "Coleção"}` : ""}</span>
            </button>
          )) : <p>Nenhum agrupamento encontrado.</p>}
        </div>
      )}
    </div>
  );
}
