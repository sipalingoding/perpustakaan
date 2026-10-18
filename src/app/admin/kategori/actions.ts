"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { books, categories, donations, profiles } from "@/db/schema";
import { readableInk } from "@/lib/color";
import { getRole, getViewer } from "@/lib/server/session";

type Fail = { ok: false; error: string; fields?: Record<string, string> };

const NOT_ALLOWED: Fail = {
  ok: false,
  error: "Hanya pustakawan yang bisa mengelola kategori. Masuk lagi dengan akun pustakawan.",
};

async function isLibrarian() {
  return !!(await getViewer()) && (await getRole()) === "pustakawan";
}

/** Nama kategori muncul di katalog, sampul, dan profil anggota, jadi semua tampilan itu ikut diperbarui. */
function refresh() {
  updateTag("categories");
  updateTag("catalog");
  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/profil");
}

const categoryInput = z.object({
  /** Nama sebelum diubah; kosong = kategori baru. */
  original: z.string().optional(),
  name: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1, "Isi nama kategori.").max(30, "Nama kategori paling panjang 30 huruf.")),
  coverBg: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pilih warna sampul."),
});

export type CategoryInput = z.input<typeof categoryInput>;

/** Tambah kategori baru, atau ganti nama/warna kategori yang ada. Buku dan sumbangan ikut pindah ke nama baru. */
export async function saveCategory(input: CategoryInput): Promise<{ ok: true; name: string } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  const parsed = categoryInput.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Ada isian yang belum benar.", fields };
  }
  const { original, name, coverBg } = parsed.data;
  const values = { name, coverBg: coverBg.toUpperCase(), coverInk: readableInk(coverBg) };

  const result = await db.transaction(async (tx): Promise<{ ok: true; name: string } | Fail> => {
    // Beda huruf besar-kecil saja dianggap sama, supaya tidak ada "Fiksi" dan "fiksi" berdampingan.
    const [taken] = await tx
      .select({ name: categories.name })
      .from(categories)
      .where(
        and(
          sql`lower(${categories.name}) = lower(${name})`,
          original ? ne(categories.name, original) : undefined,
        ),
      );
    if (taken) {
      return {
        ok: false,
        error: "Ada isian yang belum benar.",
        fields: { name: `Kategori “${taken.name}” sudah ada.` },
      } satisfies Fail;
    }

    if (!original) {
      const [{ next }] = await tx
        .select({ next: sql<number>`coalesce(max(${categories.position}), -1)::int + 1` })
        .from(categories);
      await tx.insert(categories).values({ ...values, position: next });
      return { ok: true, name } as const;
    }

    // Buku dan sumbangan ikut berganti nama lewat foreign key (on update cascade); kategori favorit anggota diganti di sini.
    const [updated] = await tx
      .update(categories)
      .set(values)
      .where(eq(categories.name, original))
      .returning({ name: categories.name });
    if (!updated) return { ok: false, error: "Kategori ini sudah dihapus. Muat ulang halaman." } satisfies Fail;
    if (name !== original) {
      await tx
        .update(profiles)
        .set({ favCategories: sql`array_replace(${profiles.favCategories}, ${original}, ${name})` })
        .where(sql`${original} = any(${profiles.favCategories})`);
    }
    return { ok: true, name } as const;
  });
  // Cache dibuang setelah transaksi selesai: kalau di dalamnya, render yang berjalan bersamaan bisa menyimpan data lama lagi.
  if (result.ok) refresh();
  return result;
}

/** Geser kategori satu langkah ke atas (-1) atau ke bawah (1) dalam urutan tampil. */
export async function moveCategory(name: string, step: -1 | 1): Promise<{ ok: true } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  if (step !== -1 && step !== 1) return { ok: false, error: "Arah geser tidak dikenal." };

  const moved = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ name: categories.name })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.name))
      .for("update");
    const from = rows.findIndex((r) => r.name === name);
    const to = from + step;
    if (from < 0 || to < 0 || to >= rows.length) return false;
    [rows[from], rows[to]] = [rows[to], rows[from]];
    // Tulis ulang semua posisi supaya urutannya rapat dan tidak ada yang kembar.
    for (const [position, r] of rows.entries()) {
      await tx.update(categories).set({ position }).where(eq(categories.name, r.name));
    }
    return true;
  });
  if (!moved) return { ok: false, error: "Urutan kategori sudah berubah. Muat ulang halaman." };
  refresh();
  return { ok: true };
}

/**
 * Hapus kategori. Bila masih dipakai buku atau sumbangan, semuanya dipindah dulu ke `moveTo`.
 * Kategori terakhir tidak bisa dihapus: setiap buku butuh kategori.
 */
export async function deleteCategory(
  name: string,
  moveTo?: string,
): Promise<{ ok: true; moved: number } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;

  const result = await db.transaction(async (tx): Promise<{ ok: true; moved: number } | Fail> => {
    const all = await tx.select({ name: categories.name }).from(categories).for("update");
    if (!all.some((c) => c.name === name)) {
      return { ok: false, error: "Kategori ini sudah dihapus. Muat ulang halaman." } satisfies Fail;
    }
    if (all.length <= 1) {
      return {
        ok: false,
        error: "Ini kategori terakhir. Tambahkan kategori lain dulu, karena setiap buku butuh kategori.",
      } satisfies Fail;
    }

    const [{ n: bookCount }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(books)
      .where(eq(books.category, name));
    const [{ n: donationCount }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(donations)
      .where(eq(donations.category, name));

    // Hanya dipakai catatan sumbangan (tanpa buku di koleksi): pindahkan diam-diam ke "Lainnya" atau kategori pertama.
    if (bookCount === 0 && !moveTo) {
      const rest = all.filter((c) => c.name !== name);
      moveTo = (rest.find((c) => c.name === "Lainnya") ?? rest[0]).name;
    }

    if (bookCount + donationCount > 0) {
      if (!moveTo || moveTo === name || !all.some((c) => c.name === moveTo)) {
        return {
          ok: false,
          error: `Kategori ini masih dipakai ${bookCount} judul. Pilih kategori tujuan untuk memindahkannya.`,
        } satisfies Fail;
      }
      await tx.update(books).set({ category: moveTo }).where(eq(books.category, name));
      await tx.update(donations).set({ category: moveTo }).where(eq(donations.category, name));
    }

    await tx
      .update(profiles)
      .set({ favCategories: sql`array_remove(${profiles.favCategories}, ${name})` })
      .where(sql`${name} = any(${profiles.favCategories})`);
    await tx.delete(categories).where(eq(categories.name, name));
    return { ok: true, moved: bookCount } as const;
  });
  if (result.ok) refresh();
  return result;
}
