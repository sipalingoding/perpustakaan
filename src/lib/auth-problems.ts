/**
 * Masalah sesi yang harus terlihat oleh anggota, bukan hanya tercatat di log server.
 * Kodenya juga dipakai di alamat (/masuk?galat=…), jadi pesannya boleh dibaca di sisi klien.
 */
export type AuthProblem = "akun-bentrok" | "layanan-masuk";

export const AUTH_PROBLEMS: Record<AuthProblem, string> = {
  "akun-bentrok":
    "Kamu sudah masuk, tapi akunmu belum tersambung dengan data anggota karena emailnya tercatat atas akun lain. Hubungi pustakawan dan sebutkan emailmu.",
  "layanan-masuk": "Layanan masuk sedang tidak bisa dihubungi, jadi kamu tampil sebagai tamu. Coba muat ulang sebentar lagi.",
};

export const isAuthProblem = (code: string | null | undefined): code is AuthProblem => !!code && code in AUTH_PROBLEMS;
