/**
 * Tipos de perfil e autenticação do usuário proprietário.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "owner" | "guest";
  preferences: {
    readerMode: "single" | "double" | "vertical";
    readerZoom: number;
    gridDensity: "compact" | "comfortable";
    autoMarkCompletedAtPercent: number; // Ex: 95
  };
  lastLoginAt?: string;
}
