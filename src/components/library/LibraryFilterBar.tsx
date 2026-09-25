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
  Filter,
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
  onToggleFilterDrawer?: () => void;
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
  onToggleFilterDrawer,
}) => {
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);

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
    filters.year !== "all" ||
    filters.status !== "all" ||
    !!filters.favoritesOnly;

  const activeFiltersCount = [
    filters.series !== "all",
    filters.character !== "all",
    filters.publisher !== "all",
    filters.year !== "all",
    filters.status !== "all",
    filters.favoritesOnly,
  ].filter(Boolean).length;

  const handleToggle = () => {
    if (onToggleFilterDrawer) {
      onToggleFilterDrawer();
    }
    setDesktopPanelOpen((prev) => !prev);
  };

  const isDesktopOpen = desktopPanelOpen || isFilterDrawerOpen;

  const filterControls = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Filtro Estado de Leitura */}
        <div className="flex flex-col">
          <label htmlFor="filter-status" className="text-[11px] font-medium text-neutral-400 mb-1">
            Status de Leitura
          </label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => handleUpdate("status", e.target.value as ComicStatus | "all")}
            className="h-10 px-2.5 sm:px-3 bg-neutral-900/90 text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#121620]">Todos</option>
            <option value="not_started" className="bg-[#121620]">Não iniciadas</option>
            <option value="reading" className="bg-[#121620]">Em leitura</option>
            <option value="completed" className="bg-[#121620]">Concluídas</option>
          </select>
        </div>

        {/* Filtro Favoritas */}
        <div className="flex flex-col">
          <label className="text-[11px] font-medium text-neutral-400 mb-1">
            Favoritas
          </label>
          <button
            type="button"
            onClick={() => handleUpdate("favoritesOnly", !filters.favoritesOnly)}
            className={`h-10 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              filters.favoritesOnly
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                : "bg-neutral-900/90 text-neutral-300 border-white/10 hover:bg-white/[0.08]"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 shrink-0 ${filters.favoritesOnly ? "fill-current text-rose-400" : ""}`} />
            <span className="truncate">{filters.favoritesOnly ? "Favoritas" : "Todas"}</span>
          </button>
        </div>

        {/* Filtro Série (Largura total no mobile para nomes longos) */}
        <div className="flex flex-col col-span-2 sm:col-span-1">
          <label htmlFor="filter-series" className="text-[11px] font-medium text-neutral-400 mb-1">
            Coleção / Franquia
          </label>
          <select
            id="filter-series"
            value={filters.series}
            onChange={(e) => handleUpdate("series", e.target.value)}
            className="h-10 px-3 bg-neutral-900/90 text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer truncate"
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
        <div className="flex flex-col col-span-2 sm:col-span-1">
          <label htmlFor="filter-character" className="text-[11px] font-medium text-neutral-400 mb-1">
            Personagem
          </label>
          <select
            id="filter-character"
            value={filters.character}
            onChange={(e) => handleUpdate("character", e.target.value)}
            className="h-10 px-3 bg-neutral-900/90 text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer truncate"
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
            className="h-10 px-2.5 sm:px-3 bg-neutral-900/90 text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer truncate"
          >
            <option value="all" className="bg-[#121620]">Todas</option>
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
            Ano
          </label>
          <select
            id="filter-year"
            value={filters.year}
            onChange={(e) => handleUpdate("year", e.target.value)}
            className="h-10 px-2.5 sm:px-3 bg-neutral-900/90 text-xs text-white border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#121620]">Todos</option>
            {years.map((y) => (
              <option key={y} value={String(y)} className="bg-[#121620]">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasAdvancedFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
          <span className="text-neutral-400">
            {activeFiltersCount} {activeFiltersCount === 1 ? "filtro ativo" : "filtros ativos"} no catálogo
          </span>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer font-semibold transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar todos os filtros</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div id="library-filter-panel" className="mb-8 space-y-3 scroll-mt-24">
      {/* Barra de Filtros Minimalista e 100% Responsiva */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-2.5 sm:p-3 bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl rounded-2xl shadow-sm">
        {/* Linha Principal de Controles no Mobile: Grid Proporcional 3 colunas */}
        <div className="grid grid-cols-[auto_1fr_auto] sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {/* Botão Filtros */}
          <button
            id="library-filter-trigger"
            type="button"
            onClick={handleToggle}
            className={`inline-flex items-center justify-center gap-2 h-9 px-3.5 sm:px-4 rounded-xl border text-xs font-semibold cursor-pointer transition-all active:scale-95 shrink-0 ${
              isDesktopOpen || activeFiltersCount > 0
                ? "bg-white text-black border-white shadow-md font-bold"
                : "bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/15"
            }`}
            aria-label="Alternar painel de filtros"
            aria-expanded={isDesktopOpen}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Ordenação: Preenche o centro com distribuição perfeita */}
          <div className="relative flex items-center min-w-0">
            <select
              id="library-sort-select"
              value={filters.sortBy}
              onChange={(e) => handleUpdate("sortBy", e.target.value as SortOption)}
              className="w-full sm:w-auto h-9 pl-3 pr-7 bg-neutral-900/90 text-xs text-neutral-200 border border-white/10 rounded-xl focus:border-white/30 focus:outline-none cursor-pointer appearance-none truncate"
              aria-label="Ordenar biblioteca"
            >
              <option value="added_at_desc" className="bg-[#121620]">Recentes</option>
              <option value="last_read_desc" className="bg-[#121620]">Última leitura</option>
              <option value="title_asc" className="bg-[#121620]">Título (A-Z)</option>
              <option value="title_desc" className="bg-[#121620]">Título (Z-A)</option>
              <option value="issue_asc" className="bg-[#121620]">Edição (1 → 9)</option>
              <option value="year_desc" className="bg-[#121620]">Ano (Recente)</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Alternância de Densidade */}
          <div className="flex items-center border border-white/10 rounded-xl p-0.5 bg-white/[0.04] h-9 shrink-0">
            <button
              onClick={() => onDensityChange("comfortable")}
              className={`h-full px-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center ${
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
              className={`h-full px-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center ${
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

        {/* Linha de Status e Ação Rápida */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto text-xs pt-1.5 sm:pt-0 border-t sm:border-t-0 border-white/5 sm:border-l sm:pl-3">
          <span className="text-neutral-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 inline-block"></span>
            <strong className="text-white font-semibold">{totalFilteredCount}</strong>{" "}
            {totalFilteredCount === 1 ? "HQ disponível" : "HQs disponíveis"}
          </span>

          {hasAdvancedFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
              title="Limpar todos os filtros"
            >
              <X className="w-3 h-3" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Chips Rápidos de Filtros Ativos (quando aplicados) */}
      {hasAdvancedFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {filters.status !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-semibold text-blue-300">
              Status: {filters.status === "reading" ? "Em leitura" : filters.status === "completed" ? "Concluída" : "Não iniciada"}
              <button
                type="button"
                onClick={() => handleUpdate("status", "all")}
                className="hover:text-white ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.favoritesOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[11px] font-semibold text-rose-300">
              Apenas Favoritas
              <button
                type="button"
                onClick={() => handleUpdate("favoritesOnly", false)}
                className="hover:text-white ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.series !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] font-semibold text-purple-300">
              Série: {seriesList.find((s) => s.id === filters.series)?.title || filters.series}
              <button
                type="button"
                onClick={() => handleUpdate("series", "all")}
                className="hover:text-white ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.publisher !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-300">
              Editora: {filters.publisher}
              <button
                type="button"
                onClick={() => handleUpdate("publisher", "all")}
                className="hover:text-white ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.year !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300">
              Ano: {filters.year}
              <button
                type="button"
                onClick={() => handleUpdate("year", "all")}
                className="hover:text-white ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.character !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300">
              Personagem: {filters.character}
              <button
                type="button"
                onClick={() => handleUpdate("character", "all")}
                className="hover:text-white ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Painel Expansível de Filtros para Telas Maiores (Desktop) */}
      {isDesktopOpen && (
        <div className="hidden lg:block p-4 sm:p-5 bg-[#0e121a]/95 border border-white/10 backdrop-blur-2xl rounded-2xl animate-in fade-in duration-200 shadow-xl">
          <div className="mb-3.5 flex items-center justify-between border-b border-white/10 pb-3">
            <span className="flex items-center gap-2 text-sm font-bold text-white">
              <SlidersHorizontal className="h-4 w-4 text-blue-400" /> Filtros do catálogo
            </span>
            <button
              onClick={() => {
                setDesktopPanelOpen(false);
                if (onCloseFilterDrawer) onCloseFilterDrawer();
              }}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Fechar filtros"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {filterControls}
        </div>
      )}

      {/* Bottom Sheet / Modal de Filtros para Mobile e Tablets */}
      {isFilterDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[300] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={onCloseFilterDrawer}
            aria-hidden="true"
          />
          <div className="relative bg-[#0d1017] border border-white/15 rounded-3xl shadow-2xl z-10 w-full sm:max-w-lg max-h-[calc(85vh-4.6rem)] sm:max-h-[85vh] flex flex-col overflow-hidden mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:mb-0 mx-2.5 sm:mx-auto">
            {/* 1. Header Fixo: nunca rola */}
            <div className="shrink-0 px-5 pt-4 pb-3.5 bg-[#0d1017] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Filtros do Catálogo</h3>
                  <p className="text-[11px] text-neutral-400">Refine as edições exibidas no catálogo</p>
                </div>
              </div>
              <button
                onClick={onCloseFilterDrawer}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Fechar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Conteúdo Rolável dos Filtros */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {filterControls}
            </div>

            {/* 3. Rodapé Fixo com Botões de Ação: TOTALMENTE ACIMA DO MENU MÓVEL */}
            <div className="shrink-0 px-4 sm:px-5 py-3.5 bg-[#0d1017] border-t border-white/10 flex items-center gap-3">
              <button
                type="button"
                onClick={onResetFilters}
                className="h-11 px-4 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white text-xs font-bold cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={onCloseFilterDrawer}
                className="flex-1 h-11 rounded-xl bg-white text-neutral-950 font-extrabold text-sm hover:bg-neutral-100 transition-all shadow-xl shadow-white/10 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Ver {totalFilteredCount} {totalFilteredCount === 1 ? "HQ" : "HQs"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
