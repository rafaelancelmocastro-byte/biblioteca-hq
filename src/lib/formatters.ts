import { ComicStatus, SortOption } from "../types/comic";

export function formatFileSize(sizeInMb: number): string {
  if (sizeInMb >= 1024) {
    return `${(sizeInMb / 1024).toFixed(1)} GB`;
  }
  return `${sizeInMb.toFixed(1)} MB`;
}

export function formatPercentage(percent: number): string {
  return `${Math.round(percent)}%`;
}

export function getStatusLabel(status: ComicStatus): string {
  switch (status) {
    case "completed":
      return "Concluída";
    case "reading":
      return "Lendo";
    case "not_started":
    default:
      return "Não iniciada";
  }
}

export function getSortLabel(option: SortOption): string {
  switch (option) {
    case "title_asc":
      return "Título (A-Z)";
    case "title_desc":
      return "Título (Z-A)";
    case "issue_asc":
      return "Edição (Menor)";
    case "issue_desc":
      return "Edição (Maior)";
    case "year_desc":
      return "Ano (Mais recente)";
    case "year_asc":
      return "Ano (Mais antigo)";
    case "added_at_desc":
      return "Adicionadas recentemente";
    case "last_read_desc":
      return "Lidas recentemente";
  }
}

export function formatRelativeDate(isoDateString?: string): string {
  if (!isoDateString) return "Nunca";
  try {
    const date = new Date(isoDateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Agora mesmo";
    if (diffMinutes < 60) return `Há ${diffMinutes} min`;
    if (diffHours < 24) return `Há ${diffHours} h`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} sem`;
    
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return isoDateString;
  }
}
