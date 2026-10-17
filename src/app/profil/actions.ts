"use server";

import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import sharp from "sharp";
import { z } from "zod";
import { bookCopies, books, categories, loans, profiles, user } from "@/db/schema";
import { AVATAR_PRESETS } from "@/lib/people";
import { deleteMemberAccount } from "@/lib/server/account-deletion";
import { deleteFile, fileUrl, newFileKey, putFile } from "@/lib/server/storage";
import { db } from "@/db";
import { getViewer } from "@/lib/server/session";
import { normalizePhone, PHONE_HINT } from "@/lib/phone";

export type ActionResult = { ok: true } | { ok: false; error: string };

const SESSION_ENDED: ActionResult = { ok: false, error: "Sesimu sudah berakhir. Masuk lagi, ya." };
const INVALID: ActionResult = { ok: false, error: "Isiannya belum benar. Periksa lagi." };

const account = z.object({
  name: z.string().trim().min(2).max(80),
  nickname: z.string().trim().min(1).max(30),
  phone: z.string().transform((v, ctx) => {
    const phone = normalizePhone(v);
    if (!phone) ctx.addIssue({ code: "custom", message: v.trim() ? PHONE_HINT : "Nomor HP wajib diisi." });
    return phone ?? "";
  }),
  bio: z.string().trim().max(280),
});

async function done(): Promise<ActionResult> {
  // Nama dan avatar tampil di header semua halaman.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveAccount(
  input: z.input<typeof account>,
): Promise<ActionResult | { ok: false; error: string; fields: Record<string, string> }> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  const parsed = account.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: fields.phone ?? "Isiannya belum benar. Periksa lagi.", fields };
  }
  const { name, nickname, phone, bio } = parsed.data;

  await db.transaction(async (tx) => {
    await tx.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, viewer.id));
    await tx.update(profiles).set({ nickname, phone, bio }).where(eq(profiles.userId, viewer.id));
  });
  return done();
}

export async function saveGender(gender: "perempuan" | "laki-laki"): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  const parsed = z.enum(["perempuan", "laki-laki"]).safeParse(gender);
  if (!parsed.success) return INVALID;
  // Karakter kembali ke bawaan jenis kelamin yang baru; foto unggahan tetap dipakai kalau sedang dipilih.
  await db.update(profiles).set({ gender: parsed.data, avatarLook: null }).where(eq(profiles.userId, viewer.id));
  return done();
}

/**
 * Catat halaman terakhir yang dibaca untuk satu pinjaman aktif milik anggota ini. Buku itu sekaligus jadi
 * "sedang dibaca" di papan Anggota. Halaman tidak boleh melebihi jumlah halaman buku (bila tercatat).
 */
export async function saveReadingProgress(
  loanId: string,
  page: number,
): Promise<{ ok: true; page: number } | { ok: false; error: string }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sesimu sudah berakhir. Masuk lagi, ya." };
  if (!z.uuid().safeParse(loanId).success || !z.number().int().min(0).max(10000).safeParse(page).success) {
    return { ok: false, error: "Nomor halaman belum benar." };
  }
  const [loan] = await db
    .select({ bookId: books.id, pages: books.pages })
    .from(loans)
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .innerJoin(books, eq(books.id, bookCopies.bookId))
    .where(and(eq(loans.id, loanId), eq(loans.userId, viewer.id), eq(loans.status, "active")));
  if (!loan) return { ok: false, error: "Pinjaman ini sudah tidak aktif. Muat ulang halaman." };
  if (loan.pages !== null && page > loan.pages) {
    return { ok: false, error: `Buku ini hanya ${loan.pages} halaman.` };
  }
  await db.transaction(async (tx) => {
    await tx.update(loans).set({ currentPage: page }).where(eq(loans.id, loanId));
    await tx.update(profiles).set({ readingBookId: loan.bookId }).where(eq(profiles.userId, viewer.id));
  });
  revalidatePath("/anggota");
  return { ok: true, page };
}

const preferences = z.object({
  favs: z.array(z.string().max(30)).max(100),
  notifs: z.object({ due: z.boolean(), fav: z.boolean() }),
});

export async function savePreferences(input: z.input<typeof preferences>): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  const parsed = preferences.safeParse(input);
  if (!parsed.success) return INVALID;
  // Hanya kategori yang masih ada; yang baru dihapus pustakawan dibuang diam-diam.
  const wanted = [...new Set(parsed.data.favs)];
  const known =
    wanted.length > 0
      ? (await db.select({ name: categories.name }).from(categories).where(inArray(categories.name, wanted))).map(
          (r) => r.name,
        )
      : [];
  await db
    .update(profiles)
    .set({ favCategories: wanted.filter((c) => known.includes(c)), notifications: parsed.data.notifs })
    .where(eq(profiles.userId, viewer.id));
  return done();
}

export async function saveLook(presetId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  const [profile] = await db.select({ gender: profiles.gender }).from(profiles).where(eq(profiles.userId, viewer.id));
  const preset = profile && AVATAR_PRESETS[profile.gender].find((p) => p.id === presetId);
  if (!preset) return INVALID;
  await db.update(profiles).set({ avatarLook: preset.look, usePhoto: false }).where(eq(profiles.userId, viewer.id));
  return done();
}

const MAX_PHOTO_BYTES = 300 * 1024;

/** Jenis gambar dari isi berkasnya, bukan dari nama atau tipe yang dikirim peramban. */
function sniffImage(b: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export type PhotoResult = { ok: true; photo: string } | { ok: false; error: string };

const PHOTO_SESSION_ENDED: PhotoResult = SESSION_ENDED;

export async function savePhoto(form: FormData): Promise<PhotoResult> {
  const viewer = await getViewer();
  if (!viewer) return PHOTO_SESSION_ENDED;
  const file = form.get("foto");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih sebuah gambar dulu." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "Fotonya terlalu besar. Coba gambar yang lebih kecil." };
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!sniffImage(bytes)) return { ok: false, error: "Hanya gambar JPG, PNG, atau WebP yang bisa dipakai." };

  // Diolah ulang di server: selalu JPEG persegi 320 px tanpa metadata, apa pun yang dikirim peramban.
  let jpeg: Buffer;
  try {
    jpeg = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(320, 320, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
  } catch {
    return { ok: false, error: "Gambar ini tidak bisa dibuka. Coba foto lain." };
  }

  const key = newFileKey("avatars", viewer.id);
  await putFile(key, jpeg);
  const [before] = await db.select({ key: profiles.photoKey }).from(profiles).where(eq(profiles.userId, viewer.id));
  await db.update(profiles).set({ photoKey: key, usePhoto: true }).where(eq(profiles.userId, viewer.id));
  await deleteFile(before?.key);
  revalidatePath("/", "layout");
  return { ok: true, photo: fileUrl(key) };
}

export async function removePhoto(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  const [before] = await db.select({ key: profiles.photoKey }).from(profiles).where(eq(profiles.userId, viewer.id));
  await db.update(profiles).set({ photoKey: null, usePhoto: false }).where(eq(profiles.userId, viewer.id));
  await deleteFile(before?.key);
  return done();
}

/** Pakai kembali foto yang sudah diunggah, setelah sempat memilih karakter. */
export async function selectPhoto(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  const updated = await db
    .update(profiles)
    .set({ usePhoto: true })
    .where(and(eq(profiles.userId, viewer.id), isNotNull(profiles.photoKey)))
    .returning({ id: profiles.userId });
  if (updated.length === 0) return INVALID;
  return done();
}

/** Hapus akun yang sedang masuk (lihat deleteMemberAccount), lalu buang cookie sesinya dari peramban ini. */
export async function deleteAccount(password: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  if (typeof password !== "string" || password.length === 0) return { ok: false, error: "Isi kata sandimu dulu." };
  const result = await deleteMemberAccount(viewer.id, password);
  if (!result.ok) return result;

  // Sesi di server sudah terhapus, tapi cookie session_data Neon Auth masih bisa dibaca sampai 5 menit.
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (name.startsWith("__Secure-neon-auth")) jar.set(name, "", { path: "/", maxAge: 0, secure: true, httpOnly: true });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
