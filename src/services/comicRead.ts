import { supabase } from "./supabaseClient";

export async function getComicReadUrl(comicId: string): Promise<string> {
  if (!supabase) throw new Error("Autenticação indisponível.");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Entre novamente para ler esta HQ.");
  const response = await fetch("/api/storage/comic-read", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ comicId }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.readUrl) throw new Error(payload?.error || "Não foi possível abrir esta edição.");
  return payload.readUrl;
}
