import type { Series } from "../types/comic";
import { supabase } from "./supabaseClient";

type ComicRegistration = {
  title: string;
  issueNumber: number;
  year: number;
  totalPages: number;
  fileName: string;
  fileSizeMb: number;
  pdfKey: string;
  series: Series;
};

export async function createComicRecord(input: ComicRegistration): Promise<string> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sua sessão expirou. Entre novamente.");

  const response = await fetch("/api/comics/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || "Não foi possível cadastrar a HQ.");
  return payload.id;
}
