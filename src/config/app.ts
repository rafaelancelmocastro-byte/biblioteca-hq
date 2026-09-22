/**
 * Configuração centralizada da aplicação Biblioteca HQ.
 * Permite alterar nome, descrição, branding e configurações de infraestrutura
 * em um único ponto da aplicação.
 */

export interface AppBrandConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  version: string;
  ownerName: string;
  ownerEmail: string;
  locale: string;
  defaultCoverAspect: string;
  theme: {
    accentColor: string; // Ex: amber-500 / #f59e0b
    accentColorHover: string;
    bgPrimary: string;
    bgSurface: string;
    bgSurfaceHover: string;
    borderColor: string;
  };
  infra: {
    supabaseReady: boolean;
    cloudflareR2Ready: boolean;
    pdfJsReady: boolean;
    storageBucketName: string;
  };
}

export const APP_CONFIG: AppBrandConfig = {
  name: "Biblioteca HQ",
  shortName: "BiblioHQ",
  tagline: "O multiverso dos quadrinhos em um só lugar.",
  description: "Biblioteca pessoal e privada de HQs em PDF com foco em capas, coleções e experiência de leitura.",
  version: "1.1.0",
  ownerName: "Rafael Castro",
  ownerEmail: "rafaelancelmo.castro@gmail.com",
  locale: "pt-BR",
  defaultCoverAspect: "2/3",
  theme: {
    accentColor: "#f59e0b", // Âmbar queimado
    accentColorHover: "#d97706",
    bgPrimary: "#0b0e14",
    bgSurface: "#131720",
    bgSurfaceHover: "#1b212f",
    borderColor: "#222a3a",
  },
  infra: {
    supabaseReady: true,
    cloudflareR2Ready: true,
    pdfJsReady: true,
    storageBucketName: "biblioteca-hqs",
  },
};
