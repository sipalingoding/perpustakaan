import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, books, loans, profiles, user } from "@/db/schema";
import { BULAN } from "@/lib/dates";
import { buildPeriods, type Member, type Period, type ShelfBook } from "@/lib/members";
import { LIBRARY_TZ, resolveLook } from "@/lib/server/members";

const asShelfBook = (b: { title: string; coverBg: string; coverInk: string; slug: string }): ShelfBook => ({
  title: b.title,
  bg: b.coverBg,
  ink: b.coverInk,
  slug: b.slug,
});

/** Papan baca: semua anggota (tanpa pustakawan) dengan jumlah pinjaman per periode dan rak koleksinya. */
export async function getMemberBoard() {
  const [people, counts, shelves, today] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        joined: user.createdAt,
        nickname: profiles.nickname,
        gender: profiles.gender,
        avatarLook: profiles.avatarLook,
        usePhoto: profiles.usePhoto,
        photoKey: profiles.photoKey,
        bio: profiles.bio,
        favs: profiles.favCategories,
        readingTitle: books.title,
        readingBg: books.coverBg,
        readingInk: books.coverInk,
        readingSlug: books.slug,
      })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .leftJoin(books, eq(books.id, profiles.readingBookId))
      // Papan baca untuk anggota; akun pustakawan bukan peserta.
      .where(eq(profiles.role, "anggota")),
    // Yang dihitung: pinjaman yang sudah diambil (aktif atau sudah dikembalikan), menurut tanggal ambil.
    db.execute<{ user_id: string; bulan: number; tahun: number; semua: number }>(sql`
      with d as (select (now() at time zone ${LIBRARY_TZ})::date as today)
      select user_id,
        count(*) filter (where start_on >= date_trunc('month', d.today))::int as bulan,
        count(*) filter (where start_on >= date_trunc('year', d.today))::int as tahun,
        count(*)::int as semua
      from loans, d where status in ('active', 'returned') group by user_id`),
    // Rak koleksi: buku yang pernah dipinjam anggota (sudah diambil atau sudah kembali), yang paling awal di kiri.
    db
      .select({
        userId: loans.userId,
        title: books.title,
        coverBg: books.coverBg,
        coverInk: books.coverInk,
        slug: books.slug,
      })
      .from(loans)
      .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
      .innerJoin(books, eq(books.id, bookCopies.bookId))
      .where(inArray(loans.status, ["active", "returned"]))
      .groupBy(loans.userId, books.id)
      .orderBy(asc(sql`min(${loans.startOn})`)),
    db.execute<{ y: number; m: number }>(
      sql`select extract(year from (now() at time zone ${LIBRARY_TZ}))::int as y, extract(month from (now() at time zone ${LIBRARY_TZ}))::int as m`,
    ),
  ]);

  const countOf = new Map(counts.rows.map((r) => [r.user_id, r]));
  const shelfOf = new Map<string, ShelfBook[]>();
  for (const row of shelves) shelfOf.set(row.userId, [...(shelfOf.get(row.userId) ?? []), asShelfBook(row)]);

  const members: Member[] = people.map((p) => {
    const c = countOf.get(p.id);
    const period: Record<Period, number> = { bulan: c?.bulan ?? 0, tahun: c?.tahun ?? 0, semua: c?.semua ?? 0 };
    return {
      id: p.id,
      name: p.name,
      first: p.nickname,
      since: String(p.joined.getUTCFullYear()),
      look: resolveLook(p.id, p),
      fav: p.favs.join(", ") || null,
      reading: p.readingTitle
        ? asShelfBook({ title: p.readingTitle, coverBg: p.readingBg!, coverInk: p.readingInk!, slug: p.readingSlug! })
        : null,
      counts: period,
      bio: p.bio,
      books: shelfOf.get(p.id) ?? [],
    };
  });

  const { y, m } = today.rows[0];
  return { members, periods: buildPeriods(y, BULAN[m - 1]) };
}
