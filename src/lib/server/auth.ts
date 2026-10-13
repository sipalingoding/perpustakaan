import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth (Managed Better Auth). Akun, kata sandi, dan sesi disimpan Neon di schema neon_auth;
 * aplikasi hanya menyimpan profil anggota di tabel sendiri dengan id yang sama.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // Pengalihan dari tautan di luar situs (mis. email) tetap membawa sesi.
    sameSite: "lax",
  },
});
