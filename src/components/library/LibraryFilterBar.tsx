import React, { useState } from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  LayoutGrid,
  Grid3X3,
  Heart,
  ArrowUpDown,
  X,
  Check,
} from "lucide-react";
import { ComicStatus, LibraryFilters, Series, Character, SortOption } from "../../types/comic";

interface LibraryFilterBarProps {
  filters: LibraryFilters;
  onFilterChange: (filters: LibraryFilters) => void;
  onResetFilters: () => void;
  seriesList: Series[];
  charactersList: Character[];
  publishers: string[];
  years: number[];
  gridDensity: "compact" | "comfortable";
  onDensityChange: (density: "compact" | "comfortable") => void;
  totalFilteredCount: number;
  isFilterDrawerOpen?: boolean;
  onCloseFilterDrawer?: () => void;
}

export const LibraryFilterBar: React.FC<LibraryFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  seriesList,
  charactersList,
  publishers,
  years,
  gridDensity,
  onDensityChange,
  totalFilteredCount,
  isFilterDrawerOpen = false,
  onCloseFilterDrawer,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleUpdate = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const hasAdvancedFilters =
    filters.series !== "all" ||
    filters.character !== "all" ||
    filters.publisher !== "all" ||
    filters.year !== "all";

  const activeAdvancedCount = [
    filters.series !== "all",
    filters.character !== "all",
    filters.publisher !== "all",
    filters.year !== "all",
  ].filter(Boolean).length;

  // Determina o segmento ativo
  const currentSegment = filters.favoritesOnly
    ? "favorites"
    : filters.status === "reading"
    ? "reading"
    : filters.status === "completed"
    ? "completed"
    : "all";

  const handleSegmentChange = (segment: "all" | "reading" | "favorites" | "completed") => {
    if (segment === "all") {
      onFilterChange({ ...filters, status: "all", favoritesOnly: false });
    } else if (segment === "reading") {
      onFilterChange({ ...filters, status: "reading", favoritesOnly: false });
    } else if (segment === "favorites") {
      onFilterChange({ ...filters, favoritesOnly: true, status: "all" });
    } else if (segment === "completed") {
      onFilterChange({ ...filters, status: "completed", favoritesOnly: false });
    }
  };

  const filterControls = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Filtro Série */}
        <div className="flex flex-col">
          <label htmlFor="filter-series" className="text-[11px] font-medium text-neutral-400 mb-1">
            Coleção / Série
          </label>
          <select
            id="filter-series"
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
          <label htmlFor="filter-character" className="text-[11px] font-medium text-neutral-400 mb-1">
            Personagem
          </label>
          <select
            id="filter-character"
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
          <label htmlFor="filter-publisher" className="text-[11px] font-medium text-neutral-400 mb-1">
            Editora
          </label>
          <select
            id="filter-publisher"
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
          <label htmlFor="filter-year" className="text-[11px] font-medium text-neutral-400 mb-1">
            Ano de Publicação
          </label>
          <select
            id="filter-year"
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

      {hasAdvancedFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
          <span className="text-neutral-400">
            Filtros avançados ativos no catálogo
          </span>
          <button
            onClick={() => {
              onFilterChange({
                ...filters,
                series: "all",
                character: "all",
                publisher: "all",
                year: "all",
              });
            }}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 cursor-pointer font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar filtros avançados</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div id="library-filter-panel" className="mb-8 space-y-3.5 scroll-mt-24">
      {/* Barra de Filtros Minimalista Estilo Apple TV+ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 sm:p-3 bg-white/[0.035] border border-white/[0.08] backdrop-blur-2xl rounded-2xl shadow-sm">
        {/* Lado Esquerdo: Segmented Control (Padrão tvOS / iOS com scroll suave sem barra) */}
        <div className="apple-segmented-control flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            type="button"
            onClick={() => handleSegmentChange("all")}
            className={`apple-segmented-button shrink-0 ${currentSegment === "all" ? "active" : ""}`}
          >
            Todas as HQs
          </button>
          <button
            type="button"
            onClick={() => handleSegmentChange("reading")}
            className={`apple-segmented-button shrink-0 ${currentSegment === "reading" ? "active" : ""}`}
          >
            Lendo
          </button>
          <button
            type="button"
            onClick={() => handleSegmentChange("favorites")}
            className={`apple-segmented-button shrink-0 flex items-center gap-1.5 ${currentSegment === "favorites" ? "active" : ""}`}
          >
            <Heart className={`w-3 h-3 ${currentSegment === "favorites" ? "fill-current" : ""}`} />
            Favoritas
          </button>
          <button
            type="button"
            onClick={() => handleSegmentChange("completed")}
            className={`apple-segmented-button shrink-0 ${currentSegment === "completed" ? "active" : ""}`}
          >
            Concluídas
          </button>
        </div>

        {/* Lado Direito: Refinar, Ordenação e Densidade */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
          {/* Botão Refinar / Filtros Avançados */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
              hasAdvancedFilters || showAdvancedFilters
                ? "bg-white text-black border-white shadow-xs"
                : "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 border-white/10"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeAdvancedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeAdvancedCount}
              </span>
            )}
          </button>

          {/* Ordenação Minimalista */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:inline" />
            <select
              id="library-sort-select"
              value={filters.sortBy}
              onChange={(e) => handleUpdate("sortBy", e.target.value as SortOption)}
              className="h-8 px-2.5 bg-white/[0.05] text-xs text-neutral-200 border border-white/10 rounded-full focus:border-white/30 focus:outline-none cursor-pointer"
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

          {/* Alternância de Densidade */}
          <div className="flex items-center border border-white/10 rounded-full p-0.5 bg-white/[0.04]">
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

      {/* Painel Expansível de Filtros para Desktop */}
      {(showAdvancedFilters || isFilterDrawerOpen) && (
        <div className="hidden md:block p-4 bg-white/[0.035] border border-white/[0.08] backdrop-blur-2xl rounded-2xl animate-in fade-in duration-200">
          {isFilterDrawerOpen && (
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
          )}
          {filterControls}
        </div>
      )}

      {/* Bottom Sheet / Drawer de Filtros para Mobile */}
      {isFilterDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-md">
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

            {filterControls}

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
