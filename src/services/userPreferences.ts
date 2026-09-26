import { supabase } from "./supabaseClient";

export type UserPreferences = {
  readerMode: "page" | "spread" | "continuous" | "horizontal";
  readerFit: "height" | "width";
  readingDirection: "auto" | "ltr" | "rtl";
  homeSection: "/biblioteca" | "/continuar" | "/lancamentos" | "/series" | "/favoritos";
  confirmMobileDownloads: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  theme: "dark";
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  readerMode: "page",
  readerFit: "height",
  readingDirection: "auto",
  homeSection: "/biblioteca",
  confirmMobileDownloads: true,
  reduceMotion: false,
  reduceTransparency: false,
  theme: "dark",
};

const key = (userId: string) => `biblioteca-hq-preferences:${userId}`;

function normalize(raw?: Partial<UserPreferences> | null): UserPreferences {
  return { ...DEFAULT_USER_PREFERENCES, ...(raw || {}), theme: "dark" };
}

export function readCachedUserPreferences(userId: string): UserPreferences {
  if (!userId) return DEFAULT_USER_PREFERENCES;
  try {
    return normalize(JSON.parse(localStorage.getItem(key(userId)) || "null"));
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

function writeCachedUserPreferences(userId: string, value: UserPreferences) {
  if (!userId) return;
  try { localStorage.setItem(key(userId), JSON.stringify(value)); } catch { /* cache optional */ }
}

export function applyUserPreferences(value: UserPreferences) {
  localStorage.setItem("biblioteca_reader_mode", value.readerMode);
  localStorage.setItem("biblioteca_reader_fit", value.readerFit);
  localStorage.setItem("biblioteca_reading_direction", value.readingDirection);
  document.documentElement.classList.toggle("reduce-motion", value.reduceMotion);
  document.documentElement.classList.toggle("reduce-transparency", value.reduceTransparency);
  document.documentElement.dataset.theme = "dark";
}

function fromRow(row: Record<string, unknown>): UserPreferences {
  return normalize({
    readerMode: row.reader_mode as UserPreferences["readerMode"],
    readerFit: row.reader_fit as UserPreferences["readerFit"],
    readingDirection: row.reading_direction as UserPreferences["readingDirection"],
    homeSection: row.home_section as UserPreferences["homeSection"],
    confirmMobileDownloads: Boolean(row.confirm_mobile_downloads),
    reduceMotion: Boolean(row.reduce_motion),
    reduceTransparency: Boolean(row.reduce_transparency),
    theme: "dark",
  });
}

function toRow(userId: string, value: UserPreferences) {
  return {
    user_id: userId,
    reader_mode: value.readerMode,
    reader_fit: value.readerFit,
    reading_direction: value.readingDirection,
    home_section: value.homeSection,
    confirm_mobile_downloads: value.confirmMobileDownloads,
    reduce_motion: value.reduceMotion,
    reduce_transparency: value.reduceTransparency,
    theme: "dark",
    updated_at: new Date().toISOString(),
  };
}

export async function loadUserPreferences(userId: string): Promise<UserPreferences> {
  const cached = readCachedUserPreferences(userId);
  applyUserPreferences(cached);
  if (!supabase || !userId || !navigator.onLine) return cached;

  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("reader_mode,reader_fit,reading_direction,home_section,confirm_mobile_downloads,reduce_motion,reduce_transparency,theme")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return cached;
    const value = fromRow(data as Record<string, unknown>);
    writeCachedUserPreferences(userId, value);
    applyUserPreferences(value);
    return value;
  } catch {
    return cached;
  }
}

export async function saveUserPreferences(userId: string, value: UserPreferences): Promise<UserPreferences> {
  const normalized = normalize(value);
  writeCachedUserPreferences(userId, normalized);
  applyUserPreferences(normalized);

  if (!supabase || !userId || !navigator.onLine) return normalized;
  try {
    const { error } = await supabase
      .from("user_preferences")
      .upsert(toRow(userId, normalized), { onConflict: "user_id" });
    if (error) throw error;
  } catch {
    // The cached value remains active and can be saved again later.
  }
  return normalized;
}

export async function saveCurrentUserPreferencePatch(patch: Partial<UserPreferences>) {
  const userId = (await supabase?.auth.getSession())?.data.session?.user.id || "";
  if (!userId) return;
  const current = readCachedUserPreferences(userId);
  await saveUserPreferences(userId, { ...current, ...patch, theme: "dark" });
}
