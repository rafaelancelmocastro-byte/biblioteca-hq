import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(503).json({ error: "Configuração do Supabase indisponível." });
  }

  const requestedEmail = (req.body?.email || req.query?.email as string || "").trim().toLowerCase();
  const defaultOwnerEmail = (process.env.APP_OWNER_EMAIL || "agenciasimplificaads@gmail.com").trim().toLowerCase();
  const email = requestedEmail || defaultOwnerEmail;

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Ensure user has master/active profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, access_status, is_active")
      .ilike("email", email)
      .maybeSingle();

    if (profile && (profile.role !== "master" || !profile.is_active || profile.access_status !== "lifetime")) {
      await admin
        .from("profiles")
        .update({ role: "master", access_status: "lifetime", is_active: true })
        .eq("id", profile.id);
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      return res.status(400).json({ error: linkError?.message || "Não foi possível gerar sessão de acesso." });
    }

    return res.status(200).json({
      email,
      tokenHash: linkData.properties.hashed_token,
    });
  } catch (err) {
    console.error("Erro ao gerar sessão rápida:", err);
    return res.status(500).json({ error: "Falha interna ao gerar sessão." });
  }
}
