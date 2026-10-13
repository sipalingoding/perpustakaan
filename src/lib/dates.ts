export const DAY = 86_400_000;

/** Tanggal UTC (bulan 1–12) dalam milidetik. */
export const utc = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day);

/**
 * "Hari ini" untuk data contoh, supaya jadwal, peringkat, dan sisa hari selalu konsisten.
 * Ganti dengan tanggal sungguhan saat data sudah berasal dari server.
 */
export const TODAY = utc(2026, 10, 5);

export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** "Senin, 12 Oktober 2026" */
export function formatLong(t: number) {
  const d = new Date(t);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Senin, 12 Oktober" */
export function formatDay(t: number) {
  const d = new Date(t);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`;
}

/** "12 Okt" */
export function formatShort(t: number) {
  const d = new Date(t);
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()].slice(0, 3)}`;
}

export function weekdayShort(t: number) {
  return HARI_PENDEK[new Date(t).getUTCDay()];
}

export function dayOfMonth(t: number) {
  return new Date(t).getUTCDate();
}
