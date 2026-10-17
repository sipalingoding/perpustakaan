import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { books, categories } from "@/db/schema";
import type { CategoryInfo } from "@/lib/books";

/**
 * Semua kategori menurut urutan pustakawan. Sama untuk semua pengunjung, jadi di-cache;
 * tag "categories" dihapus setiap kali pustakawan menambah, mengubah, mengurutkan, atau menghapus kategori.
 */
export async function getCategories(): Promise<CategoryInfo[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("hours");
  const rows = await db.select().from(categories).orderBy(asc(categories.position), asc(categories.name));
  return rows.map((r) => ({ name: r.name, cover: { bg: r.coverBg, ink: r.coverInk } }));
}

export type AdminCategory = CategoryInfo & { books: number };

/** Kategori beserta jumlah judul di koleksi, untuk /admin/kategori. Tidak di-cache: pustakawan perlu angka terbaru. */
export async function getAdminCategories(): Promise<AdminCategory[]> {
  const rows = await db
    .select({
      name: categories.name,
      coverBg: categories.coverBg,
      coverInk: categories.coverInk,
      books: sql<number>`count(${books.id})::int`,
    })
    .from(categories)
    .leftJoin(books, eq(books.category, categories.name))
    .groupBy(categories.name)
    .orderBy(asc(categories.position), asc(categories.name));
  return rows.map((r) => ({ name: r.name, cover: { bg: r.coverBg, ink: r.coverInk }, books: r.books }));
}
