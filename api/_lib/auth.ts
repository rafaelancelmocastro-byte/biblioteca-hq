import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length);
}

export async function requireOwner(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  res.setHeader("Cache-Control", "private, no-store");
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = getBearerToken(req);

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(503).json({ error: "Serviço de armazenamento indisponível." });
    return false;
  }

  if (!accessToken) {
    console.warn("Tentativa de acesso administrativo sem sessão", { path: req.url });
    res.status(401).json({ error: "Autenticação obrigatória." });
    return false;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient.auth.getUser(accessToken);

  const profile = data.user ? await adminClient.from("profiles").select("role,is_active").eq("id", data.user.id).maybeSingle() : null;
  if (error || !data.user || profile?.data?.role !== "master" || !profile.data.is_active) {
    console.warn("Tentativa de acesso administrativo não autorizado", { path: req.url, userId: data.user?.id });
    res.status(403).json({ error: "Acesso restrito ao proprietário." });
    return false;
  }

  return true;
}
