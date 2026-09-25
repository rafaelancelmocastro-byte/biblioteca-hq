import React from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  LayoutGrid,
  Grid3X3,
  ArrowUpDown,
  X,
} from "lucide-react";
import { LibraryFilters, Series, Character, SortOption } from "../../types/comic";

interface LibraryFilterBarProps {
  filters: LibraryFilters;
  onFilterChange: (filters: LibraryFilters) => void;
  seriesList: Series[];
  charactersList: Character[];
  publishers: string[];
  years: number[];
  gridDensity: "compact" | "comfortable";
  onDensityChange: (density: "compact" | "comfortable") => void;
  totalFilteredCount: number;
  isFilterDrawerOpen?: boolean;
  onToggleFilterDrawer?: () => void;
  onCloseFilterDrawer?: () => void;
}

export const LibraryFilterBar: React.FC<LibraryFilterBarProps> = ({
  filters,
  onFilterChange,
  seriesList,
  charactersList,
  publishers,
  years,
  gridDensity,
  onDensityChange,
  totalFilteredCount,
  isFilterDrawerOpen = false,
  onToggleFilterDrawer,
  onCloseFilterDrawer,
}) => {

  const handleUpdate = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters =
    filters.series !== "all" ||
    filters.character !== "all" ||
    filters.publisher !== "all" ||
    filters.year !== "all" ||
    filters.status !== "all" ||
    filters.favoritesOnly;

  const activeFilterCount = [
    filters.series !== "all",
    filters.character !== "all",
    filters.publisher !== "all",
    filters.year !== "all",
    filters.status !== "all",
    filters.favoritesOnly,
  ].filter(Boolean).length;

  const renderFilterControls = (idPrefix: string) => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label htmlFor={`${idPrefix}-filter-status`} className="text-[11px] font-medium text-neutral-400 mb-1">Leitura</label>
          <select
            id={`${idPrefix}-filter-status`}
            value={filters.status}
            onChange={(e) => handleUpdate("status", e.target.value as LibraryFilters["status"])}
            className="h-9 px-3 bg-white/[0.05] text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#121620]">Todas</option>
            <option value="reading" className="bg-[#121620]">Lendo</option>
            <option value="completed" className="bg-[#121620]">Concluídas</option>
            <option value="not_started" className="bg-[#121620]">Não iniciadas</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor={`${idPrefix}-filter-favorites`} className="text-[11px] font-medium text-neutral-400 mb-1">Favoritos</label>
          <select
            id={`${idPrefix}-filter-favorites`}
            value={filters.favoritesOnly ? "favorites" : "all"}
            onChange={(e) => handleUpdate("favoritesOnly", e.target.value === "favorites")}
            className="h-9 px-3 bg-white/[0.05] text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#121620]">Todas as HQs</option>
            <option value="favorites" className="bg-[#121620]">Somente favoritas</option>
          </select>
        </div>
        {/* Filtro Série */}
        <div className="flex flex-col">
          <label htmlFor={`${idPrefix}-filter-series`} className="text-[11px] font-medium text-neutral-400 mb-1">
            Coleção / Série
          </label>
          <select
            id={`${idPrefix}-filter-series`}
            value={filters.series}
            onChange={(e) => handleUpdate("series", e.target.value)}
            className="h-9 px-3 bg-white/[0.05] text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#121620]">Todas as Séries</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#121620]">
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Personagem */}
        <div className="flex flex-col">
          <label htmlFor={`${idPrefix}-filter-character`} className="text-[11px] font-medium text-neutral-400 mb-1">
            Personagem
          </label>
          <select
            id={`${idPrefix}-filter-character`}
            value={filters.character}
            onChange={(e) => handleUpdate("character", e.target.value)}
            className="h-9 px-3 bg-white/[0.05] text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#121620]">Todos os Personagens</option>
            {charactersList.map((c) => (
              <option key={c.id} value={c.name} className="bg-[#121620]">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Editora */}
        <div className="flex flex-col">
          <label htmlFor={`${idPrefix}-filter-publisher`} className="text-[11px] font-medium text-neutral-400 mb-1">
            Editora
          </label>
          <select
            id={`${idPrefix}-filter-publisher`}
            value={filters.publisher}
            onChange={(e) => handleUpdate("publisher", e.target.value)}
            className="h-9 px-3 bg-white/[0.05] text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#121620]">Todas as Editoras</option>
            {publishers.map((p) => (
              <option key={p} value={p} className="bg-[#121620]">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Ano */}
        <div className="flex flex-col">
          <label htmlFor={`${idPrefix}-filter-year`} className="text-[11px] font-medium text-neutral-400 mb-1">
            Ano de Publicação
          </label>
          <select
            id={`${idPrefix}-filter-year`}
            value={filters.year}
            onChange={(e) => handleUpdate("year", e.target.value)}
            className="h-9 px-3 bg-white/[0.05] text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#121620]">Todos os Anos</option>
            {years.map((y) => (
              <option key={y} value={String(y)} className="bg-[#121620]">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
          <span className="text-neutral-400">
            Filtros ativos no catálogo
          </span>
          <button
            onClick={() => onFilterChange({
              ...filters,
              series: "all",
              character: "all",
              publisher: "all",
              year: "all",
              status: "all",
              favoritesOnly: false,
            })}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 cursor-pointer font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar filtros</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div id="library-filter-panel" className="mb-8 space-y-3.5 scroll-mt-24">
      <div className="flex flex-col gap-3 p-3 bg-white/[0.035] border border-white/[0.08] backdrop-blur-2xl rounded-2xl shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="px-1 text-xs text-neutral-400 whitespace-nowrap" aria-live="polite">
          <strong className="text-white">{totalFilteredCount}</strong> {totalFilteredCount === 1 ? "HQ encontrada" : "HQs encontradas"}
        </span>
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onToggleFilterDrawer}
            aria-expanded={isFilterDrawerOpen}
            aria-controls="catalog-filter-controls-desktop catalog-filter-controls-mobile"
            className={`inline-flex h-9 items-center gap-1.5 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
              hasActiveFilters || isFilterDrawerOpen
                ? "bg-white text-black border-white shadow-xs"
                : "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 border-white/10"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex min-w-0 items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:inline" />
            <select
              id="library-sort-select"
              value={filters.sortBy}
              onChange={(e) => handleUpdate("sortBy", e.target.value as SortOption)}
              className="h-9 min-w-0 w-full px-2.5 bg-white/[0.05] text-xs text-neutral-200 border border-white/10 rounded-full focus:border-white/30 focus:outline-none cursor-pointer sm:w-auto"
              aria-label="Ordenar biblioteca"
            >
              <option value="added_at_desc" className="bg-[#121620]">Recentes</option>
              <option value="last_read_desc" className="bg-[#121620]">Última leitura</option>
              <option value="title_asc" className="bg-[#121620]">Título (A-Z)</option>
              <option value="title_desc" className="bg-[#121620]">Título (Z-A)</option>
              <option value="issue_asc" className="bg-[#121620]">Edição (1 → 9)</option>
              <option value="year_desc" className="bg-[#121620]">Ano (Recente)</option>
            </select>
          </div>

          <div className="flex items-center shrink-0 border border-white/10 rounded-full p-0.5 bg-white/[0.04]">
            <button
              onClick={() => onDensityChange("comfortable")}
              className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                gridDensity === "comfortable"
                  ? "bg-white text-black font-bold shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Exibição Confortável"
              aria-label="Grid confortável"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDensityChange("compact")}
              className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                gridDensity === "compact"
                  ? "bg-white text-black font-bold shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Exibição Compacta"
              aria-label="Grid compacto"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isFilterDrawerOpen && (
        <div id="catalog-filter-controls-desktop" className="hidden md:block p-4 bg-white/[0.035] border border-white/[0.08] backdrop-blur-2xl rounded-2xl animate-in fade-in duration-200">
            <div className="mb-3.5 flex items-center justify-between border-b border-white/10 pb-3">
              <span className="flex items-center gap-2 text-sm font-bold text-white">
                <SlidersHorizontal className="h-4 w-4 text-blue-400" /> Filtros do catálogo
              </span>
              <button
                onClick={onCloseFilterDrawer}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
                aria-label="Fechar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          {renderFilterControls("desktop")}
        </div>
      )}

      {/* Bottom Sheet / Drawer de Filtros para Mobile */}
      {isFilterDrawerOpen && (
        <div id="catalog-filter-controls-mobile" className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-md">
          <div
            className="fixed inset-0"
            onClick={onCloseFilterDrawer}
            aria-hidden="true"
          />
          <div className="relative bg-[#0d1017] border-t border-white/15 rounded-t-3xl p-5 shadow-2xl z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <h3 className="text-base font-bold text-white">Filtros do Catálogo</h3>
              </div>
              <button
                onClick={onCloseFilterDrawer}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10"
                aria-label="Fechar filtros"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderFilterControls("mobile")}

            <div className="mt-6 pt-3.5 border-t border-white/10">
              <button
                type="button"
                onClick={onCloseFilterDrawer}
                className="w-full h-11 rounded-full bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors"
              >
                Ver {totalFilteredCount} {totalFilteredCount === 1 ? "HQ" : "HQs"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
