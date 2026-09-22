import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export async function requireUser(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = /^Bearer (.+)$/i.exec(String(req.headers.authorization || ""))?.[1];
  if (!url || !key) { res.status(503).json({ error: "Serviço indisponível." }); return null; }
  if (!token) { console.warn("Tentativa de acesso sem autenticação", { path: req.url }); res.status(401).json({ error: "Autenticação obrigatória." }); return null; }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) { console.warn("Acesso não autorizado aos arquivos", { path: req.url }); res.status(403).json({ error: "Acesso negado." }); return null; }
  return { admin, user: data.user };
}
