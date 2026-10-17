import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/server/due-reminders";

/**
 * Cron harian (lihat vercel.json, 08.00 WIB): kirim pengingat jatuh tempo lewat email dan WhatsApp.
 * Vercel Cron mengirim "Authorization: Bearer <CRON_SECRET>"; permintaan lain ditolak.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET belum diisi." }, { status: 500 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  const run = await sendDueReminders();
  return Response.json(run);
}
