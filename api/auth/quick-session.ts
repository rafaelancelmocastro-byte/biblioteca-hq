import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerEmail = (process.env.APP_OWNER_EMAIL || "rafaelancelmo.castro@gmail.com").trim().toLowerCase();
  const requestedEmail = String(req.body?.email || req.query?.email || "").trim().toLowerCase();

  if (!url || !key) return res.status(503).json({ error: "Configuração do Supabase indisponível." });

  // This endpoint exists only as a recovery path for the master account.
  // Public users must authenticate normally and can only be created after a confirmed purchase.
  if (requestedEmail && requestedEmail !== ownerEmail) {
    return res.status(403).json({ error: "Acesso direto indisponível para esta conta." });
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const { data: profile } = await admin.from("profiles").select("id,role,access_status,is_active").ilike("email", ownerEmail).maybeSingle();
    if (!profile || profile.role !== "master" || profile.access_status !== "lifetime" || !profile.is_active) {
      return res.status(403).json({ error: "Conta master não autorizada." });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: ownerEmail });
    if (linkError || !linkData?.properties?.hashed_token) {
      return res.status(400).json({ error: linkError?.message || "Não foi possível gerar sessão de acesso." });
    }

    return res.status(200).json({ email: ownerEmail, tokenHash: linkData.properties.hashed_token });
  } catch (err) {
    console.error("Erro ao gerar sessão rápida:", err);
    return res.status(500).json({ error: "Falha interna ao gerar sessão." });
  }
}
