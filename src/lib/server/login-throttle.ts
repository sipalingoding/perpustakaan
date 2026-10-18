import "server-only";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginFailures } from "@/db/schema";

/**
 * Batas tebak kata sandi. Neon Auth tidak membatasi percobaan yang gagal, jadi semua jalan masuk (formulir lewat
 * /api/auth, nomor anggota, dan /api/token) mencatat kegagalan di sini: per akun supaya satu akun tidak bisa ditebak
 * terus, dan per alamat IP supaya satu pengunjung tidak bisa mencoba banyak akun.
 */
const WINDOW_MINUTES = 15;
const MAX_PER_ACCOUNT = 8;
const MAX_PER_IP = 30;

export const LOGIN_BLOCKED = `Terlalu banyak percobaan masuk yang gagal. Tunggu ${WINDOW_MINUTES} menit lalu coba lagi.`;

export type LoginKeys = { ip: string; account: string };

/** Alamat pengunjung dari header proxy (Vercel mengisi x-forwarded-for); "?" bila tidak ada. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "?";
}

const keysOf = ({ ip, account }: LoginKeys) => [`ip:${ip}`, ...(account ? [`akun:${account.toLowerCase()}`] : [])];

/**
 * Pembatas yang rusak (mis. tabel belum dimigrasi, database tersendat) tidak boleh mengunci semua orang: masuk tetap
 * jalan dan masalahnya dicatat di log server.
 */
async function safely<T>(what: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    console.warn(`[batas-masuk] Gagal ${what}, batas percobaan dilewati:`, e instanceof Error ? e.message : e);
    return fallback;
  }
}

/** Apakah akun atau alamat ini sedang diblokir sementara. */
export async function loginBlocked(keys: LoginKeys): Promise<boolean> {
  return safely("membaca percobaan gagal", () => countBlocked(keys), false);
}

async function countBlocked(keys: LoginKeys): Promise<boolean> {
  const rows = await db
    .select({ key: loginFailures.key, n: sql<number>`count(*)::int` })
    .from(loginFailures)
    .where(
      and(
        inArray(loginFailures.key, keysOf(keys)),
        gt(loginFailures.at, sql`now() - make_interval(mins => ${WINDOW_MINUTES})`),
      ),
    )
    .groupBy(loginFailures.key);
  return rows.some((r) => r.n >= (r.key.startsWith("ip:") ? MAX_PER_IP : MAX_PER_ACCOUNT));
}

export async function recordLoginFailure(keys: LoginKeys) {
  await safely(
    "mencatat percobaan gagal",
    async () => {
      await db.insert(loginFailures).values(keysOf(keys).map((key) => ({ key })));
      await db.delete(loginFailures).where(lt(loginFailures.at, sql`now() - interval '1 day'`));
    },
    undefined,
  );
}

/** Masuk berhasil: hitungan akun ini dimulai lagi dari nol (hitungan per IP tetap). */
export async function clearLoginFailures(account: string) {
  if (!account) return;
  await safely(
    "menghapus percobaan gagal",
    () => db.delete(loginFailures).where(eq(loginFailures.key, `akun:${account.toLowerCase()}`)),
    undefined,
  );
}
