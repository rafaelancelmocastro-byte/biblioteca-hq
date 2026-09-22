import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length);
}

export async function requireOwner(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerEmail = process.env.APP_OWNER_EMAIL?.toLowerCase();
  const accessToken = getBearerToken(req);

  if (!supabaseUrl || !serviceRoleKey || !ownerEmail) {
    res.status(503).json({ error: "Serviço de armazenamento indisponível." });
    return false;
  }

  if (!accessToken) {
    res.status(401).json({ error: "Autenticação obrigatória." });
    return false;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient.auth.getUser(accessToken);

  if (error || !data.user || data.user.email?.toLowerCase() !== ownerEmail) {
    res.status(403).json({ error: "Acesso restrito ao proprietário." });
    return false;
  }

  return true;
}
