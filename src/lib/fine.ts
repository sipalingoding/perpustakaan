/** Denda keterlambatan: Rp5.000 untuk setiap hari setelah batas pengembalian. */
export const FINE_PER_DAY = 5000;

const DAY = 86_400_000;

/** Berapa hari terlambat. Pada hari jatuh tempo itu sendiri belum terlambat. */
export function overdueDays(dueMs: number, todayMs: number) {
  return Math.max(0, Math.round((todayMs - dueMs) / DAY));
}

export function fineFor(days: number) {
  return days * FINE_PER_DAY;
}

/** 15000 -> "Rp 15.000" */
export function rupiah(amount: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}
