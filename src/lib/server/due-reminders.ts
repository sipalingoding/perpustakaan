import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, books, loans, profiles, user } from "@/db/schema";
import { formatLong } from "@/lib/dates";
import { LIBRARY } from "@/lib/library";
import { normalizePhone } from "@/lib/phone";
import { LIBRARY_TZ, REMINDER_DAYS } from "@/lib/server/members";
import { emailConfigured, sendEmail, sendWhatsApp, siteUrl, whatsappConfigured } from "@/lib/server/messaging";

export type ReminderRun = {
  /** Anggota yang pinjamannya jatuh tempo dan pengingatnya menyala. */
  members: number;
  email: { sent: number; failed: number; skipped: number };
  whatsapp: { sent: number; failed: number; skipped: number };
  errors: string[];
};

type DueLoan = { loanId: string; dueOn: string; title: string; today: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return formatLong(Date.UTC(y, m - 1, d));
};

/** "besok, Senin, 19 Oktober 2026" atau "hari ini, …". */
const whenText = (l: DueLoan) => `${l.dueOn === l.today ? "hari ini" : "besok"}, ${longDate(l.dueOn)}`;

function compose(name: string, list: DueLoan[]) {
  const link = `${siteUrl()}/jadwal`;
  const lines = list.map((l) => `• “${l.title}”: kembalikan ${whenText(l)}`);
  const intro = `Halo ${name}, ini pengingat dari Perpustakaan Lembar.`;
  const outro =
    `Serahkan bukunya di meja sirkulasi pada jam layanan (${LIBRARY.days}, ${LIBRARY.hours} WIB), ` +
    `atau perpanjang lewat halaman Jadwal saya: ${link}`;
  const subject =
    list.length === 1 ? `Pengingat: “${list[0].title}” jatuh tempo ${whenText(list[0]).split(",")[0]}` : `Pengingat: ${list.length} buku segera jatuh tempo`;
  const text = [intro, "", ...lines, "", outro, "", "Pengingat ini bisa dimatikan di halaman Jadwal saya."].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1d2b28">
<p>${escapeHtml(intro)}</p>
<ul>${list.map((l) => `<li><strong>${escapeHtml(l.title)}</strong>: kembalikan ${escapeHtml(whenText(l))}</li>`).join("")}</ul>
<p>Serahkan bukunya di meja sirkulasi pada jam layanan (${escapeHtml(`${LIBRARY.days}, ${LIBRARY.hours}`)} WIB), atau perpanjang lewat <a href="${escapeHtml(link)}">Jadwal saya</a>.</p>
<p style="color:#5a6a65;font-size:13px">Pengingat ini bisa dimatikan di halaman Jadwal saya.</p>
</div>`;
  return { subject, text, html, whatsapp: [intro, "", ...lines, "", outro].join("\n") };
}

/**
 * Kirim pengingat jatuh tempo lewat email dan WhatsApp ke anggota yang menyalakan "Ingatkan aku".
 * Yang diingatkan: pinjaman aktif yang jatuh tempo besok (atau hari ini, bila kemarin terlewat), belum diajukan
 * pengembaliannya, dan belum pernah diingatkan untuk tanggal jatuh tempo itu. Dipanggil cron harian
 * (/api/cron/pengingat) dan saat anggota menyalakan pengingat (`onlyUserId`).
 */
export async function sendDueReminders(onlyUserId?: string): Promise<ReminderRun> {
  const today = sql<string>`to_char((now() at time zone ${LIBRARY_TZ})::date, 'YYYY-MM-DD')`;
  const rows = await db
    .select({
      loanId: loans.id,
      dueOn: loans.dueOn,
      today,
      userId: user.id,
      name: user.name,
      email: user.email,
      nickname: profiles.nickname,
      phone: profiles.phone,
      title: books.title,
    })
    .from(loans)
    .innerJoin(user, eq(user.id, loans.userId))
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .innerJoin(books, eq(books.id, bookCopies.bookId))
    .leftJoin(profiles, eq(profiles.userId, loans.userId))
    .where(
      and(
        eq(loans.status, "active"),
        isNull(loans.returnRequestedAt),
        sql`${loans.dueOn} between (now() at time zone ${LIBRARY_TZ})::date and (now() at time zone ${LIBRARY_TZ})::date + ${REMINDER_DAYS}::int`,
        sql`${loans.remindedFor} is distinct from ${loans.dueOn}`,
        // Profil belum ada = pengaturan bawaan, dan bawaannya menyala.
        sql`coalesce((${profiles.notifications}->>'due')::boolean, true)`,
        onlyUserId ? eq(loans.userId, onlyUserId) : undefined,
      ),
    )
    .orderBy(loans.dueOn);

  const run: ReminderRun = {
    members: 0,
    email: { sent: 0, failed: 0, skipped: 0 },
    whatsapp: { sent: 0, failed: 0, skipped: 0 },
    errors: [],
  };
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  run.members = byUser.size;

  for (const list of byUser.values()) {
    const who = list[0];
    const msg = compose(who.nickname || who.name, list);
    let delivered = false;

    if (emailConfigured()) {
      const r = await sendEmail(who.email, msg.subject, msg.text, msg.html);
      if (r.ok) {
        run.email.sent++;
        delivered = true;
      } else {
        run.email.failed++;
        run.errors.push(`Email ke ${who.email}: ${r.error}`);
      }
    } else run.email.skipped++;

    const phone = who.phone ? normalizePhone(who.phone) : null;
    if (whatsappConfigured() && phone) {
      const r = await sendWhatsApp(phone, msg.whatsapp);
      if (r.ok) {
        run.whatsapp.sent++;
        delivered = true;
      } else {
        run.whatsapp.failed++;
        run.errors.push(`WhatsApp ke ${phone}: ${r.error}`);
      }
    } else run.whatsapp.skipped++;

    // Ditandai hanya bila minimal satu kanal sampai, supaya yang gagal dicoba lagi pada putaran berikutnya.
    if (delivered) {
      await db
        .update(loans)
        .set({ remindedFor: sql`${loans.dueOn}` })
        .where(
          inArray(
            loans.id,
            list.map((l) => l.loanId),
          ),
        );
    }
  }
  if (!emailConfigured()) run.errors.push("Email belum diatur: isi RESEND_API_KEY dan EMAIL_FROM.");
  if (!whatsappConfigured()) run.errors.push("WhatsApp belum diatur: isi FONNTE_TOKEN.");
  return run;
}
