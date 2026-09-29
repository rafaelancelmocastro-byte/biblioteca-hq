import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type LastlinkPayload = {
  Id?: string;
  IsTest?: boolean;
  Event?: string;
  CreatedAt?: string;
  Data?: {
    Buyer?: { Id?: string; Email?: string; Name?: string };
    Member?: { Id?: string; Email?: string };
    Purchase?: { PaymentId?: string; Price?: { Value?: number }; Payment?: { PaymentMethod?: string } };
    Offer?: { Id?: string; Name?: string; Url?: string };
  };
};

const allowedEvents = new Set([
  "Purchase_Order_Confirmed",
  "Refund_Requested",
  "Payment_Refund",
  "Payment_Chargeback",
  "Product_access_ended",
]);

const normalizeEmail = (value?: string) => (value || "").trim().toLowerCase();
const offerCodeFromUrl = (value?: string) => value?.match(/lastlink\.com\/p\/([A-Z0-9]+)/i)?.[1]?.toUpperCase() || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.LASTLINK_WEBHOOK_SECRET;
  const expectedOfferCode = (process.env.LASTLINK_OFFER_CODE || "C95A90981").toUpperCase();

  if (!url || !serviceRoleKey || !secret) return res.status(503).json({ error: "Integração indisponível." });

  const requestUrl = new URL(req.url || "/api/integrations/lastlink", "https://bibliotecahq.com.br");
  const querySecret = requestUrl.searchParams.get("secret") || "";
  const bearerSecret = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const headerSecret = String(req.headers["x-webhook-secret"] || "").trim();
  const providedSecret = querySecret || bearerSecret || headerSecret;

  if (providedSecret !== secret) {
    console.warn("Lastlink webhook unauthorized", {
      hasQuerySecret: Boolean(querySecret),
      hasBearerSecret: Boolean(bearerSecret),
      hasHeaderSecret: Boolean(headerSecret),
      requestPath: requestUrl.pathname,
    });
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = req.body as LastlinkPayload;
  const eventId = String(payload?.Id || "").trim();
  const eventName = String(payload?.Event || "").trim();
  if (!eventId || !allowedEvents.has(eventName)) return res.status(200).json({ ignored: true });
  if (payload.IsTest && process.env.LASTLINK_ALLOW_TEST_EVENTS !== "1") return res.status(200).json({ ignored: true, test: true });

  const offerCode = offerCodeFromUrl(payload.Data?.Offer?.Url);
  if (!offerCode || offerCode !== expectedOfferCode) return res.status(200).json({ ignored: true, reason: "offer" });

  const buyerEmail = normalizeEmail(payload.Data?.Buyer?.Email || payload.Data?.Member?.Email);
  if (!buyerEmail) return res.status(400).json({ error: "E-mail do comprador ausente." });

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: existingEvent } = await admin.from("lastlink_webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
  if (existingEvent) return res.status(200).json({ ok: true, duplicate: true });

  try {
    let userId: string | null = null;
    const { data: profile } = await admin.from("profiles").select("id,role").ilike("email", buyerEmail).maybeSingle();
    userId = profile?.id || null;

    if (eventName === "Purchase_Order_Confirmed") {
      if (!userId) {
        const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingUser = users.users.find((user) => normalizeEmail(user.email) === buyerEmail);
        if (existingUser) userId = existingUser.id;
      }

      if (!userId) {
        const origin = process.env.APP_PUBLIC_URL || "https://bibliotecahq.com.br";
        const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(buyerEmail, {
          redirectTo: `${origin.replace(/\/$/, "")}/ativar-conta`,
          data: { name: payload.Data?.Buyer?.Name || "", purchase_source: "lastlink" },
        });
        if (inviteError || !invited.user) throw inviteError || new Error("Falha ao criar convite.");
        userId = invited.user.id;
      }

      const { error: accessError } = await admin.from("profiles").upsert({
        id: userId,
        email: buyerEmail,
        display_name: payload.Data?.Buyer?.Name || buyerEmail,
        role: profile?.role === "master" ? "master" : "user",
        access_status: "lifetime",
        is_active: true,
      }, { onConflict: "id" });
      if (accessError) throw accessError;
    } else if (userId && profile?.role !== "master") {
      const { error: blockError } = await admin
        .from("profiles")
        .update({ access_status: "blocked", is_active: false })
        .eq("id", userId);
      if (blockError) throw blockError;
    }

    const status =
      eventName === "Purchase_Order_Confirmed"
        ? "confirmed"
        : eventName === "Refund_Requested"
          ? "refund_requested"
          : eventName === "Payment_Refund"
            ? "refunded"
            : "chargeback";
    const { error: eventError } = await admin.from("lastlink_webhook_events").insert({
      event_id: eventId,
      event_name: eventName,
      is_test: Boolean(payload.IsTest),
      payload,
    });
    if (eventError) throw eventError;

    const { error: purchaseError } = await admin.from("lastlink_purchases").insert({
      event_id: eventId,
      buyer_email: buyerEmail,
      buyer_name: payload.Data?.Buyer?.Name || null,
      buyer_id: payload.Data?.Buyer?.Id || payload.Data?.Member?.Id || null,
      payment_id: payload.Data?.Purchase?.PaymentId || null,
      offer_id: payload.Data?.Offer?.Id || null,
      offer_code: offerCode,
      amount: payload.Data?.Purchase?.Price?.Value ?? null,
      payment_method: payload.Data?.Purchase?.Payment?.PaymentMethod || null,
      status,
      user_id: userId,
    });
    if (purchaseError) throw purchaseError;

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Lastlink webhook error:", error);
    return res.status(500).json({ error: "Falha ao processar evento." });
  }
}
