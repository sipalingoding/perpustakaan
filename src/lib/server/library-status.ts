import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { libraryStatus } from "@/db/schema";

export type LibraryStatus = { closed: boolean; note: string };

/**
 * Status tutup manual dari pustakawan (baris belum ada = tidak sedang ditutup), beserta jam server saat dibaca
 * (ms) untuk menghitung buka/tutup menurut jam layanan.
 */
export async function getLibraryStatus(): Promise<{ status: LibraryStatus; now: number }> {
  const { rows } = await db.execute<{ closed: boolean | null; note: string | null; now: string }>(
    sql`select s.closed, s.note, (extract(epoch from now()) * 1000)::bigint::text as now
        from (select 1) as one left join ${libraryStatus} s on s.id = 1`,
  );
  const r = rows[0];
  return { status: { closed: r?.closed ?? false, note: r?.note ?? "" }, now: Number(r?.now ?? 0) };
}
