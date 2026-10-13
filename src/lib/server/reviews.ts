import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { AvatarLook } from "@/components/Avatar";
import { db } from "@/db";
import { bookReviews, books, profiles, user } from "@/db/schema";
import { LIBRARY_TZ, resolveLook } from "@/lib/server/members";

export type BookReview = {
  id: string;
  name: string;
  /** Karakter ilustrasi pengulas. Foto unggahan tidak dipakai: halaman buku terbuka untuk tamu. */
  look: AvatarLook;
  rating: number;
  body: string;
  /** "YYYY-MM-DD" menurut waktu Jakarta. */
  date: string;
};

export type ReviewSummary = {
  avg: number;
  count: number;
  /** Jumlah ulasan per bintang, indeks 0 = 1 bintang. */
  stars: [number, number, number, number, number];
  reviews: BookReview[];
};

/** Ulasan pembaca untuk satu buku, terbaru lebih dulu. Ikut tag "catalog", yang dihapus saat buku dikembalikan. */
export async function getBookReviews(slug: string): Promise<ReviewSummary> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");

  const rows = await db
    .select({
      id: bookReviews.id,
      userId: bookReviews.userId,
      name: sql<string>`coalesce(nullif(trim(${profiles.nickname}), ''), ${user.name})`,
      gender: profiles.gender,
      avatarLook: profiles.avatarLook,
      rating: bookReviews.rating,
      body: bookReviews.body,
      date: sql<string>`to_char((${bookReviews.updatedAt} at time zone ${LIBRARY_TZ})::date, 'YYYY-MM-DD')`,
    })
    .from(bookReviews)
    .innerJoin(books, eq(books.id, bookReviews.bookId))
    .innerJoin(user, eq(user.id, bookReviews.userId))
    .innerJoin(profiles, eq(profiles.userId, bookReviews.userId))
    .where(eq(books.slug, slug))
    .orderBy(desc(bookReviews.updatedAt));

  const stars: ReviewSummary["stars"] = [0, 0, 0, 0, 0];
  for (const r of rows) stars[r.rating - 1]++;
  const count = rows.length;
  const avg = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return {
    avg,
    count,
    stars,
    reviews: rows.map((r) => ({
      id: r.id,
      name: r.name,
      look: resolveLook(r.userId, { gender: r.gender, avatarLook: r.avatarLook, usePhoto: false, photoKey: null }),
      rating: r.rating,
      body: r.body,
      date: r.date,
    })),
  };
}
