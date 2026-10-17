import "server-only";

/**
 * Kirim pesan ke luar aplikasi: email lewat Resend, WhatsApp lewat Fonnte (gateway WhatsApp Indonesia).
 * Kanal yang kuncinya belum diisi dilewati dengan alasan yang jelas, bukan dianggap berhasil.
 */

export type SendResult = { ok: true } | { ok: false; error: string };

const TIMEOUT_MS = 10_000;

/** Alamat situs untuk tautan di pesan, mis. https://lembar.example.id. */
export function siteUrl() {
  const explicit = process.env.SITE_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const whatsappConfigured = () => Boolean(process.env.FONNTE_TOKEN);

export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, error: "Email belum diatur (RESEND_API_KEY dan EMAIL_FROM kosong)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, error: `Resend menolak (${res.status}): ${body?.message ?? res.statusText}` };
  } catch (e) {
    return { ok: false, error: `Resend tidak bisa dihubungi: ${(e as Error).message}` };
  }
}

/** `phone` dalam bentuk baku "08…" (lihat lib/phone). */
export async function sendWhatsApp(phone: string, message: string): Promise<SendResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { ok: false, error: "WhatsApp belum diatur (FONNTE_TOKEN kosong)." };
  try {
    const form = new FormData();
    form.set("target", phone);
    form.set("message", message);
    form.set("countryCode", "62");
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => null)) as { status?: boolean; reason?: string } | null;
    if (res.ok && body?.status) return { ok: true };
    return { ok: false, error: `Fonnte menolak (${res.status}): ${body?.reason ?? res.statusText}` };
  } catch (e) {
    return { ok: false, error: `Fonnte tidak bisa dihubungi: ${(e as Error).message}` };
  }
}
