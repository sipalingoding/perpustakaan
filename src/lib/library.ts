/** Data perpustakaan yang tampil di footer dan halaman Sumbang. Ubah di sini saja. */
export const LIBRARY = {
  /** Hari buka. */
  days: "Setiap hari",
  hours: "10.00–17.00",
  /** Jam buka dan tutup (jam bulat, waktu Jakarta). Slot antar/jemput sumbangan dihitung dari sini. */
  openHour: 10,
  closeHour: 17,
  address: "Jl. Sindang Rancah, Rancah, Kec. Rancah, Kabupaten Ciamis, Jawa Barat 46387",
} as const;

/** Slot antar/jemput per jam: 10.00, 11.00, … sampai satu jam sebelum tutup. */
export const VISIT_HOURS: number[] = Array.from({ length: LIBRARY.closeHour - LIBRARY.openHour }, (_, i) => LIBRARY.openHour + i);

/** 14 -> "14.00" */
export const formatHour = (h: number) => `${String(h).padStart(2, "0")}.00`;

/** Menit sejak tengah malam menurut jam Jakarta. */
function jakartaMinutes(now: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export type OpenState = {
  open: boolean;
  /** Di luar jam layanan: ilustrasi berganti malam. */
  afterHours: boolean;
  /** Pagi sebelum jam buka (bukan malam setelah tutup). */
  beforeOpen: boolean;
  /** Ditutup manual oleh pustakawan. */
  manual: boolean;
};

/** Buka bila masih jam layanan dan pustakawan tidak sedang menutupnya. */
export function openState(now: number, manualClosed: boolean): OpenState {
  const m = jakartaMinutes(now);
  const beforeOpen = m < LIBRARY.openHour * 60;
  const afterHours = beforeOpen || m >= LIBRARY.closeHour * 60;
  return { open: !afterHours && !manualClosed, afterHours, beforeOpen, manual: manualClosed };
}
