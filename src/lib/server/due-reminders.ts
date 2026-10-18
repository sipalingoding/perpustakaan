import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, books, loans, profiles, user } from "@/db/schema";
import { formatLong } from "@/lib/dates";
import { fineFor, overdueDays, rupiah } from "@/lib/fine";
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

/** Buku yang terlambat diingatkan lagi setiap sekian hari (pertama kali sehari setelah jatuh tempo). */
const LATE_EVERY_DAYS = 3;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return formatLong(Date.UTC(y, m - 1, d));
};

const lateDays = (l: DueLoan) => overdueDays(Date.parse(l.dueOn), Date.parse(l.today));

/** "besok, Senin, 19 Oktober 2026", "hari ini, …", atau "terlambat 2 hari (batasnya …), denda Rp 10.000". */
function whenText(l: DueLoan) {
  const late = lateDays(l);
  if (late > 0) return `terlambat ${late} hari (batasnya ${longDate(l.dueOn)}), denda ${rupiah(fineFor(late))}`;
  return `${l.dueOn === l.today ? "hari ini" : "besok"}, ${longDate(l.dueOn)}`;
}

function compose(name: string, list: DueLoan[]) {
  const link = `${siteUrl()}/jadwal`;
  const anyLate = list.some((l) => lateDays(l) > 0);
  const lines = list.map((l) => `• “${l.title}”: ${lateDays(l) > 0 ? "" : "kembalikan "}${whenText(l)}`);
  const intro = `Halo ${name}, ini pengingat dari Perpustakaan Lembar.`;
  const hours = `${LIBRARY.days}, ${LIBRARY.hours} WIB`;
  const outro =
    `Serahkan bukunya di meja sirkulasi pada jam layanan (${hours})${anyLate ? "; denda berhenti dihitung saat bukunya diterima" : ""}. ${link}`;
  const subject =
    list.length === 1
      ? lateDays(list[0]) > 0
        ? `Pengingat: “${list[0].title}” terlambat ${lateDays(list[0])} hari`
        : `Pengingat: “${list[0].title}” jatuh tempo ${whenText(list[0]).split(",")[0]}`
      : `Pengingat: ${list.length} buku ${anyLate ? "perlu dikembalikan" : "segera jatuh tempo"}`;
  const text = [intro, "", ...lines, "", outro, "", "Pengingat ini bisa dimatikan di halaman Jadwal saya."].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1d2b28">
<p>${escapeHtml(intro)}</p>
<ul>${list.map((l) => `<li><strong>${escapeHtml(l.title)}</strong>: ${escapeHtml(`${lateDays(l) > 0 ? "" : "kembalikan "}${whenText(l)}`)}</li>`).join("")}</ul>
<p>Serahkan bukunya di meja sirkulasi pada jam layanan (${escapeHtml(hours)})${anyLate ? "; denda berhenti dihitung saat bukunya diterima" : ""}. <a href="${escapeHtml(link)}">Buka Jadwal saya</a>.</p>
<p style="color:#5a6a65;font-size:13px">Pengingat ini bisa dimatikan di halaman Jadwal saya.</p>
</div>`;
  return { subject, text, html, whatsapp: [intro, "", ...lines, "", outro].join("\n") };
}

/**
 * Kirim pengingat jatuh tempo lewat email dan WhatsApp ke anggota yang menyalakan "Ingatkan aku".
 * Yang diingatkan: pinjaman aktif yang belum diajukan pengembaliannya dan jatuh tempo besok (atau hari ini, bila
 * kemarin terlewat), atau sudah terlambat (sehari setelah jatuh tempo, lalu setiap LATE_EVERY_DAYS hari). Dipanggil cron harian
 * (/api/cron/pengingat) dan saat anggota menyalakan pengingat (`onlyUserId`).
 */
export async function sendDueReminders(onlyUserId?: string): Promise<ReminderRun> {
  const today = sql<string>`to_char((now() at time zone ${LIBRARY_TZ})::date, 'YYYY-MM-DD')`;
  const day = sql`(now() at time zone ${LIBRARY_TZ})::date`;
  // Yang perlu diingatkan: jatuh tempo hari ini/besok dan belum diingatkan untuk tanggal itu, atau sudah terlambat
  // dan belum diingatkan sejak terlambat (atau terakhir diingatkan LATE_EVERY_DAYS hari lalu).
  // reminded_for menyimpan tanggal jatuh tempo untuk pengingat sebelum jatuh tempo, dan tanggal kirim untuk yang terlambat.
  const due = sql`(
    (${loans.dueOn} between ${day} and ${day} + ${REMINDER_DAYS}::int and ${loans.remindedFor} is distinct from ${loans.dueOn})
    or (${loans.dueOn} < ${day} and (${loans.remindedFor} is null or ${loans.remindedFor} <= ${loans.dueOn}
        or ${loans.remindedFor} <= ${day} - ${LATE_EVERY_DAYS}::int))
  )`;
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
        due,
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

  for (const pending of byUser.values()) {
    // Tandai dulu sebelum mengirim: cron dan tombol "Ingatkan aku" yang berjalan bersamaan tidak mengirim dua kali,
    // karena hanya satu yang berhasil mengambil barisnya. Bila semua kanal gagal, tandanya dikembalikan.
    const { rows: claimed } = await db.execute<{ id: string; prev: string | null }>(sql`
      with picked as (
        select ${loans.id} as id, ${loans.remindedFor} as prev from ${loans}
        where ${inArray(loans.id, pending.map((l) => l.loanId))} and ${due}
        for update skip locked
      )
      update ${loans} set reminded_for = greatest(${loans.dueOn}, ${day})
      from picked where ${loans.id} = picked.id
      returning picked.id, to_char(picked.prev, 'YYYY-MM-DD') as prev`);
    const list = pending.filter((l) => claimed.some((c) => c.id === l.loanId));
    if (list.length === 0) continue;
    run.members++;
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

    // Tidak ada kanal yang sampai: kembalikan tandanya supaya dicoba lagi pada putaran berikutnya.
    if (!delivered) {
      for (const c of claimed) {
        await db
          .update(loans)
          .set({ remindedFor: c.prev })
          .where(eq(loans.id, c.id));
      }
    }
  }
  if (!emailConfigured()) run.errors.push("Email belum diatur: isi RESEND_API_KEY dan EMAIL_FROM.");
  if (!whatsappConfigured()) run.errors.push("WhatsApp belum diatur: isi FONNTE_TOKEN.");
  return run;
}
