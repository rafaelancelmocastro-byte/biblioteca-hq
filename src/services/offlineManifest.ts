import { supabase } from "./supabaseClient";

export async function getOfflineLibraryIds(): Promise<Set<string>> {
  try {
    const userId = (await supabase?.auth.getSession())?.data.session?.user.id;
    if (!supabase || !userId) return new Set();
    const { data, error } = await supabase
      .from("offline_library")
      .select("comic_id")
      .eq("user_id", userId);
    if (error) return new Set();
    return new Set((data ?? []).map((item) => item.comic_id));
  } catch {
    return new Set();
  }
}

export async function addOfflineLibraryItem(comicId: string): Promise<boolean> {
  try {
    const userId = (await supabase?.auth.getSession())?.data.session?.user.id;
    if (!supabase || !userId) return false;
    const { error } = await supabase
      .from("offline_library")
      .upsert({ user_id: userId, comic_id: comicId }, { onConflict: "user_id,comic_id" });
    return !error;
  } catch {
    return false;
  }
}

export async function removeOfflineLibraryItem(comicId: string): Promise<boolean> {
  try {
    const userId = (await supabase?.auth.getSession())?.data.session?.user.id;
    if (!supabase || !userId) return false;
    const { error } = await supabase
      .from("offline_library")
      .delete()
      .eq("user_id", userId)
      .eq("comic_id", comicId);
    return !error;
  } catch {
    return false;
  }
}
