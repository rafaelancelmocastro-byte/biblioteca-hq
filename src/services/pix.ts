export type CheckoutSettings = {
  lifetime_price_cents: number;
  pix_key: string;
  pix_merchant_name: string;
  pix_merchant_city: string;
  whatsapp_number: string;
};

export const REGULAR_LIFETIME_PRICE_CENTS = 2999;

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;
const ascii = (value: string, length: number) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 .-]/g, "").slice(0, length);

// BR Code estático (EMV), com CRC16/CCITT-FALSE.
export function makePixCode(settings: CheckoutSettings): string {
  const key = settings.pix_key.trim();
  const name = ascii(settings.pix_merchant_name, 25);
  const city = ascii(settings.pix_merchant_city, 15);
  if (!key || !name || !city || settings.lifetime_price_cents < 1) return "";
  const payload = field("00", "01") + field("26", field("00", "br.gov.bcb.pix") + field("01", key))
    + field("52", "0000") + field("53", "986") + field("54", (settings.lifetime_price_cents / 100).toFixed(2))
    + field("58", "BR") + field("59", name) + field("60", city) + field("62", field("05", "***")) + "6304";
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return payload + crc.toString(16).toUpperCase().padStart(4, "0");
}
