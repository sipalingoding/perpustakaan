/**
 * Waktu aktivitas terakhir anggota, dibagi antar-tab lewat localStorage: aktif di satu tab menjaga sesi di tab lain.
 * Dihapus saat keluar dan ditulis ulang saat masuk, supaya catatan lama tidak langsung mengeluarkan sesi baru.
 */
const KEY = "lembar:aktivitas-terakhir";

/** Bawaan bila IDLE_TIMEOUT_MINUTES tidak diisi atau tidak valid. */
export const DEFAULT_IDLE_MINUTES = 30;

/** Alasan di /masuk?keluar=… setelah sesi diakhiri otomatis. */
export const IDLE_SIGN_OUT = "tidak-aktif";

export function idleMinutes(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_IDLE_MINUTES;
}

export function readActivity(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function markActivity(at = Date.now()) {
  try {
    localStorage.setItem(KEY, String(at));
  } catch {
    // Penyimpanan diblokir (mode privat tertentu): penghitung di tab ini tetap berjalan sendiri.
  }
}

export function clearActivity() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function idleMessage(minutes: string | null): string {
  const n = Number(minutes);
  const span = Number.isFinite(n) && n > 0 ? `${n.toLocaleString("id-ID")} menit` : "beberapa saat";
  return `Kamu otomatis keluar karena tidak aktif selama ${span}. Masuk lagi untuk melanjutkan.`;
}
