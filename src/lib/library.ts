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
