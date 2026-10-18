import "server-only";
import { eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/db";
import { profiles, user } from "@/db/schema";
import type { AuthProblem } from "@/lib/auth-problems";
import { auth } from "@/lib/server/auth";

export type Viewer = { id: string; name: string; email: string };

type AuthState = { viewer: Viewer | null; problem: AuthProblem | null };

/** Bagian akun Neon Auth yang dibutuhkan, dari getSession() atau dari isi JWT. */
export type AuthAccount = { id: string; name: string; email: string; emailVerified: boolean; createdAt: string | Date };

/**
 * Sesi saat ini beserta masalahnya, bila ada. Membaca cookie, jadi hanya boleh dipanggil dari komponen yang
 * dibungkus <Suspense> (aturan Cache Components).
 *
 * Sesi datang dari Neon Auth. Data anggota (nama yang bisa diubah di Profil, profil, pinjaman) ada di tabel
 * aplikasi dengan id yang sama; barisnya dibuat saat akun pertama kali masuk. Masalah tidak disembunyikan sebagai
 * "tamu": `problem` ditampilkan di header dan di halaman Masuk.
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  // Pemeriksaan sesi membandingkan masa berlaku dengan waktu sekarang. Dengan Cache Components, waktu tidak boleh
  // dibaca saat prarender, jadi bagian ini ditunda sampai ada permintaan sungguhan.
  await connection();
  let account;
  try {
    const { data, error } = await auth.getSession();
    if (error) throw error;
    account = data?.user;
  } catch (e) {
    console.warn("[sesi] Neon Auth tidak bisa dihubungi:", e instanceof Error ? e.message : e);
    return { viewer: null, problem: "layanan-masuk" };
  }
  if (!account) return { viewer: null, problem: null };

  return memberFor(account);
});

/**
 * Baris anggota untuk akun Neon Auth, dibuat saat akun pertama kali masuk. Dipakai sesi cookie (getAuthState) dan
 * token Bearer (src/lib/server/bearer.ts).
 */
export async function memberFor(account: AuthAccount): Promise<AuthState> {
  const [member] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, account.id));
  if (member) return { viewer: { id: account.id, ...member }, problem: null };

  // Akun yang baru dihapus masih bisa terbaca dari cookie session_data di perangkat lain (sampai 5 menit); jangan
  // buat ulang datanya.
  const { rows } = await db.execute(sql`select 1 from neon_auth."user" where id::text = ${account.id}`);
  if (rows.length === 0) return { viewer: null, problem: null };

  // Akun baru: buat baris anggotanya. Email yang sudah dipakai anggota lain tidak diambil alih.
  const [created] = await db
    .insert(user)
    .values({
      id: account.id,
      name: account.name,
      email: account.email.toLowerCase(),
      emailVerified: account.emailVerified,
      createdAt: new Date(account.createdAt),
    })
    .onConflictDoNothing()
    .returning({ name: user.name, email: user.email });
  if (!created) {
    console.warn(`[sesi] Akun Neon Auth ${account.id} bentrok email dengan data anggota lain.`);
    return { viewer: null, problem: "akun-bentrok" };
  }
  return { viewer: { id: account.id, ...created }, problem: null };
}

/** Anggota yang sedang masuk, atau null untuk tamu (dan untuk sesi yang bermasalah, lihat getAuthState). */
export async function getViewer(): Promise<Viewer | null> {
  return (await getAuthState()).viewer;
}

/** Untuk halaman khusus anggota. proxy.ts hanya memeriksa cookie, pemeriksaan sungguhan ada di sini. */
export async function requireViewer(next?: string): Promise<Viewer> {
  const { viewer, problem } = await getAuthState();
  if (viewer) return viewer;
  const to = new URLSearchParams();
  if (next) to.set("lanjut", next);
  if (problem) to.set("galat", problem);
  redirect(to.size ? `/masuk?${to}` : "/masuk");
}

/** Peran anggota yang sedang masuk; tamu dianggap "anggota". */
export const getRole = cache(async (): Promise<"anggota" | "pustakawan"> => {
  const viewer = await getViewer();
  return viewer ? roleOf(viewer.id) : "anggota";
});

export async function roleOf(userId: string): Promise<"anggota" | "pustakawan"> {
  const [row] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.userId, userId));
  return row?.role ?? "anggota";
}

/** Untuk halaman dan aksi khusus pustakawan. Selain pustakawan melihat 404, supaya keberadaan /admin tidak terbaca. */
export async function requireLibrarian(next = "/admin"): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if ((await getRole()) !== "pustakawan") notFound();
  return viewer;
}
