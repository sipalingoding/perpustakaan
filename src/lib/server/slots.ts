import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { VISIT_HOURS } from "@/lib/library";
import { addDays, LIBRARY_TZ } from "@/lib/server/members";

/** Tanggal dan jam kunjungan yang bisa dipilih (ambil buku pinjaman, antar/jemput sumbangan). */
export type VisitSchedule = {
  /** "YYYY-MM-DD": hari ini (bila masih ada slot) sampai `daysAhead` hari ke depan. */
  dates: string[];
  /** Jam pertama yang masih bisa dipilih hari ini; null bila hari ini tidak ada di `dates`. */
  todayFirstHour: number | null;
};

/** Jadwal menurut kalender dan jam perpustakaan (Jakarta), bukan jam perangkat anggota. */
export async function visitSchedule(daysAhead: number): Promise<VisitSchedule> {
  const { rows } = await db.execute<{ today: string; minutes: number }>(sql`
    select to_char((now() at time zone ${LIBRARY_TZ})::date, 'YYYY-MM-DD') as today,
           (extract(hour from now() at time zone ${LIBRARY_TZ}) * 60 + extract(minute from now() at time zone ${LIBRARY_TZ}))::int as minutes`);
  const { today, minutes } = rows[0];
  // Slot hari ini harus dimulai setelah sekarang: pukul 10.30, slot pertama 11.00.
  const todayFirstHour = VISIT_HOURS.find((h) => h * 60 > minutes) ?? null;
  const later = Array.from({ length: daysAhead }, (_, i) => addDays(today, i + 1));
  return { dates: todayFirstHour === null ? later : [today, ...later], todayFirstHour };
}

/** Apakah tanggal dan jam ini termasuk pilihan di jadwal. Dipakai server sebelum menyimpan. */
export function isInSchedule({ dates, todayFirstHour }: VisitSchedule, dateIso: string, hour: number) {
  if (!dates.includes(dateIso) || !VISIT_HOURS.includes(hour)) return false;
  // Bila hari ini ada di jadwal, ia selalu tanggal pertama; jam yang sudah lewat ditolak.
  return todayFirstHour === null || dateIso !== dates[0] || hour >= todayFirstHour;
}
