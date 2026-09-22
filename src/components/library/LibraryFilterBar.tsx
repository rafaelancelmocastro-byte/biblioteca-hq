import React, { useState } from "react";
import {
  Filter,
  RotateCcw,
  LayoutGrid,
  Grid3X3,
  Heart,
  ArrowUpDown,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { ComicStatus, LibraryFilters, Series, Character, SortOption } from "../../types/comic";
import { Button } from "../ui/Button";

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

  const hasActiveFilters =
    filters.series !== "all" ||
    filters.character !== "all" ||
    filters.publisher !== "all" ||
    filters.year !== "all" ||
    filters.status !== "all" ||
    filters.favoritesOnly;

  const filterControls = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {/* Filtro Série */}
        <div className="flex flex-col">
          <label htmlFor="filter-series" className="text-[11px] font-semibold text-slate-400 mb-1">
            Série
          </label>
          <select
            id="filter-series"
            value={filters.series}
            onChange={(e) => handleUpdate("series", e.target.value)}
            className="h-8 px-2 bg-[#121622] text-xs text-slate-200 border border-slate-700/70 rounded-lg focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as Séries</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Personagem */}
        <div className="flex flex-col">
          <label htmlFor="filter-character" className="text-[11px] font-semibold text-slate-400 mb-1">
            Personagem
          </label>
          <select
            id="filter-character"
            value={filters.character}
            onChange={(e) => handleUpdate("character", e.target.value)}
            className="h-8 px-2 bg-[#121622] text-xs text-slate-200 border border-slate-700/70 rounded-lg focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Personagens</option>
            {charactersList.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Editora */}
        <div className="flex flex-col">
          <label htmlFor="filter-publisher" className="text-[11px] font-semibold text-slate-400 mb-1">
            Editora
          </label>
          <select
            id="filter-publisher"
            value={filters.publisher}
            onChange={(e) => handleUpdate("publisher", e.target.value)}
            className="h-8 px-2 bg-[#121622] text-xs text-slate-200 border border-slate-700/70 rounded-lg focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as Editoras</option>
            {publishers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Ano */}
        <div className="flex flex-col">
          <label htmlFor="filter-year" className="text-[11px] font-semibold text-slate-400 mb-1">
            Ano
          </label>
          <select
            id="filter-year"
            value={filters.year}
            onChange={(e) => handleUpdate("year", e.target.value)}
            className="h-8 px-2 bg-[#121622] text-xs text-slate-200 border border-slate-700/70 rounded-lg focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Anos</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Status */}
        <div className="flex flex-col">
          <label htmlFor="filter-status" className="text-[11px] font-semibold text-slate-400 mb-1">
            Status
          </label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => handleUpdate("status", e.target.value as "all" | ComicStatus)}
            className="h-8 px-2 bg-[#121622] text-xs text-slate-200 border border-slate-700/70 rounded-lg focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="not_started">Não iniciada</option>
            <option value="reading">Lendo</option>
            <option value="completed">Concluída</option>
          </select>
        </div>

        {/* Botão de Favoritos Rápido */}
        <div className="flex flex-col justify-end">
          <button
            onClick={() => handleUpdate("favoritesOnly", !filters.favoritesOnly)}
            className={`h-8 px-3 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              filters.favoritesOnly
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-[#121622] hover:bg-[#1a2030] text-slate-300 border-slate-700/70"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${filters.favoritesOnly ? "fill-rose-400 text-rose-400" : ""}`} />
            <span>Favoritos</span>
          </button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-amber-400 font-medium">
            Filtros ativos aplicados ao catálogo
          </span>
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar filtros</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div id="library-filter-panel" className="mb-6 space-y-3 scroll-mt-24">
      {/* Barra de Ações Superior: Contagem, Ordenação e Densidade */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#131722] border border-[#1e2535] rounded-xl shadow-sm">
        {/* Contagem e Toggle de Filtros Avançados */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-white">
            <strong className="text-amber-400 font-bold">{totalFilteredCount}</strong>{" "}
            {totalFilteredCount === 1 ? "HQ encontrada" : "HQs encontradas"}
          </span>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border cursor-pointer transition-colors ${
              hasActiveFilters || showAdvancedFilters
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                : "bg-slate-800/80 text-slate-300 border-slate-700"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showAdvancedFilters ? "Ocultar Filtros" : "Refinar Acervo"}</span>
          </button>
        </div>

        {/* Direita: Ordenação e Densidade */}
        <div className="flex items-center gap-2">
          {/* Ordenação */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <select
              id="library-sort-select"
              value={filters.sortBy}
              onChange={(e) => handleUpdate("sortBy", e.target.value as SortOption)}
              className="h-8 px-2 bg-[#0e121a] text-xs text-slate-200 border border-slate-700/80 rounded-lg focus:border-amber-500 focus:outline-none cursor-pointer"
              aria-label="Ordenar biblioteca"
            >
              <option value="added_at_desc">Adicionadas recentemente</option>
              <option value="last_read_desc">Última leitura</option>
              <option value="title_asc">Título (A-Z)</option>
              <option value="title_desc">Título (Z-A)</option>
              <option value="issue_asc">Edição (Crescente)</option>
              <option value="issue_desc">Edição (Decrescente)</option>
              <option value="year_desc">Ano (Mais recente)</option>
              <option value="year_asc">Ano (Mais antigo)</option>
            </select>
          </div>

          {/* Alternância de Densidade */}
          <div className="flex items-center border border-slate-700/80 rounded-lg p-0.5 bg-[#0e121a]">
            <button
              onClick={() => onDensityChange("comfortable")}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                gridDensity === "comfortable"
                  ? "bg-amber-500 text-black shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Exibição Confortável"
              aria-label="Grid confortável"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDensityChange("compact")}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                gridDensity === "compact"
                  ? "bg-amber-500 text-black shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
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
        <div className="hidden md:block p-4 bg-[#131722] border border-[#1e2535] rounded-xl animate-in fade-in duration-150">
          {isFilterDrawerOpen && (
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2 text-sm font-bold text-white"><SlidersHorizontal className="h-4 w-4 text-amber-400" /> Filtros do catálogo</span>
              <button onClick={onCloseFilterDrawer} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar filtros"><X className="h-4 w-4" /></button>
            </div>
          )}
          {filterControls}
        </div>
      )}

      {/* Bottom Sheet / Drawer de Filtros para Mobile */}
      {isFilterDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={onCloseFilterDrawer}
            aria-hidden="true"
          />
          <div className="relative bg-[#131722] border-t border-slate-700 rounded-t-2xl p-5 shadow-2xl z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Filtros do Catálogo</h3>
              </div>
              <button
                onClick={onCloseFilterDrawer}
                className="p-1 rounded-md text-slate-400 hover:text-white"
                aria-label="Fechar filtros"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {filterControls}

            <div className="mt-6 pt-3 border-t border-slate-800">
              <Button
                variant="primary"
                onClick={onCloseFilterDrawer}
                className="w-full h-11 text-sm font-bold"
              >
                Ver {totalFilteredCount} HQs
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
