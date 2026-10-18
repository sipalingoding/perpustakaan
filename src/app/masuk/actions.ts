"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import { clearLoginFailures, clientIp, LOGIN_BLOCKED, loginBlocked, recordLoginFailure } from "@/lib/server/login-throttle";
import { emailForMemberNo, parseMemberNo } from "@/lib/server/member-no";
import { getProfile } from "@/lib/server/members";
import { getRole, getViewer } from "@/lib/server/session";

/** Hanya alamat di situs ini yang boleh jadi tujuan, supaya ?lanjut= tidak bisa dipakai mengalihkan ke situs lain. */
const safePath = (next: string | null) =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;

/**
 * Tujuan setelah masuk. Pustakawan langsung ke dasbor koleksi, kecuali sedang menuju halaman tertentu
 * lewat ?lanjut=. Anggota kembali ke halaman asal atau ke katalog.
 */
export async function landingAfterSignIn(next: string | null): Promise<string> {
  const target = safePath(next);
  if (!(await getViewer())) return target ?? "/";
  if ((await getRole()) === "pustakawan") return target && target !== "/" ? target : "/admin";
  return target ?? "/";
}

/** Langkah terakhir daftar: buat profil anggota dengan jenis kelamin yang dipilih di formulir. */
export async function finishSignUp(gender: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  await getProfile(viewer.id);
  await db
    .update(profiles)
    .set({ gender: gender === "laki-laki" ? "laki-laki" : "perempuan", avatarLook: null })
    .where(eq(profiles.userId, viewer.id));
}

export type MemberSignInResult = { ok: true } | { ok: false; error: string };

const MEMBER_MISMATCH = "Nomor anggota atau kata sandi belum cocok. Periksa lagi, ya.";

/**
 * Masuk dengan nomor kartu anggota. Nomornya dicocokkan ke email di server, lalu masuk lewat Neon Auth dari server
 * (cookie sesi dipasang di respons ini). Email anggota tidak pernah dikirim ke browser, dan nomor yang tidak ada
 * mendapat pesan yang sama dengan kata sandi salah, supaya nomor anggota tidak bisa ditebak satu per satu.
 */
export async function signInWithMemberNo(
  memberNo: string,
  password: string,
  remember: boolean,
): Promise<MemberSignInResult> {
  const parsed = parseMemberNo(String(memberNo ?? ""));
  if (!parsed) return { ok: false, error: "Tulis nomor anggota seperti di kartumu, mis. LMB-2610-0007." };
  if (typeof password !== "string" || password.length === 0) return { ok: false, error: "Isi kata sandimu." };

  const email = await emailForMemberNo(parsed);
  // Nomor yang tidak ada tetap dihitung sebagai percobaan gagal, supaya nomor anggota tidak bisa dipindai.
  const keys = { ip: clientIp(await headers()), account: email ?? `nomor:${parsed.no}` };
  if (await loginBlocked(keys)) return { ok: false, error: LOGIN_BLOCKED };
  if (!email) {
    await recordLoginFailure(keys);
    return { ok: false, error: MEMBER_MISMATCH };
  }

  try {
    const { error } = await auth.signIn.email({ email, password, rememberMe: remember });
    if (!error) {
      await clearLoginFailures(email);
      return { ok: true };
    }
    const { code, status } = error as { code?: string; status?: number };
    if (status === 429 || code === "over_request_rate_limit") {
      return { ok: false, error: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi." };
    }
    await recordLoginFailure(keys);
    return { ok: false, error: MEMBER_MISMATCH };
  } catch (e) {
    console.warn("[masuk] Neon Auth tidak bisa dihubungi:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Layanan masuk sedang tidak bisa dihubungi. Coba lagi sebentar lagi." };
  }
}
