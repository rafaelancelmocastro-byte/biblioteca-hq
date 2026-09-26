import {
  BookOpen,
  CalendarDays,
  Download,
  Heart,
  History,
  Layers3,
  Map,
  Settings,
  BookMarked,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  section?: string;
  description?: string;
  ownerOnly?: boolean;
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Biblioteca", path: "/biblioteca", icon: BookOpen, section: "Principal", description: "Todo o acervo" },
  { label: "Continuar Lendo", path: "/continuar", icon: History, description: "Retome de onde parou" },
  { label: "Lançamentos", path: "/lancamentos", icon: CalendarDays, description: "Novidades e publicações recentes" },
  { label: "Séries & Sagas", path: "/series", icon: Layers3, description: "Coleções, fases e sagas" },
  { label: "Mangás & Indie", path: "/multiverso", icon: BookMarked, section: "Descobrir", description: "Mangás, manhwas e independentes" },
  { label: "Guia de Leitura", path: "/guia", icon: Map, description: "Rotas e ordens de leitura" },
  { label: "Favoritos", path: "/favoritos", icon: Heart, section: "Sua coleção", description: "Obras que você salvou" },
  { label: "Baixados Offline", path: "/offline", icon: Download, description: "Disponíveis sem conexão" },
  { label: "Configurações", path: "/configuracoes", icon: Settings, section: "Gestão", description: "Preferências e acervo", ownerOnly: true },
];

export const MOBILE_PRIMARY_PATHS = new Set(["/biblioteca", "/continuar", "/lancamentos", "/series"]);
