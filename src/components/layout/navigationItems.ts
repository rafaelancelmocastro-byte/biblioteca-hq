import { BookOpen, Clock, Compass, HardDriveDownload, Heart, Layers, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  section?: string;
  description?: string;
  ownerOnly?: boolean;
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Biblioteca", path: "/biblioteca", icon: BookOpen, section: "Explorar" },
  { label: "Lançamentos", path: "/lancamentos", icon: Sparkles, description: "Edições recém-chegadas" },
  { label: "Séries & Sagas", path: "/series", icon: Layers, description: "Coleções e histórias em ordem" },
  { label: "Mangás & Indie", path: "/multiverso", icon: Compass, description: "Obras orientais e independentes" },
  { label: "Guia de Leitura", path: "/guia", icon: Compass, description: "Encontre seu caminho de leitura" },
  { label: "Continuar Lendo", path: "/continuar", icon: Clock, section: "Sua Coleção" },
  { label: "Favoritos", path: "/favoritos", icon: Heart },
  { label: "Baixados Offline", path: "/offline", icon: HardDriveDownload, description: "HQs disponíveis sem conexão" },
  { label: "Configurações", path: "/configuracoes", icon: ShieldCheck, section: "Gestão", description: "Painel do acervo", ownerOnly: true },
];

export const MOBILE_PRIMARY_PATHS = new Set(["/biblioteca", "/continuar", "/series", "/favoritos"]);
