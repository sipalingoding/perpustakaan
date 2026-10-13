import type { AvatarLook } from "@/components/Avatar";
import type { ShelfKey } from "@/lib/books";

/** Data contoh anggota untuk papan baca. Semua nama fiktif. */
export type Period = "bulan" | "tahun" | "semua";

export type SampleMember = {
  id: string;
  name: string;
  first: string;
  since: string;
  look: AvatarLook;
  fav: string;
  reading: ShelfKey;
  counts: Record<Period, number>;
  bio: string;
  books: ShelfKey[];
};

export type PeriodInfo = { key: Period; label: string; phrase: string; title: string };

/** Periode papan baca menurut tanggal hari ini. */
export function buildPeriods(year: number, monthName: string): PeriodInfo[] {
  return [
    { key: "bulan", label: "Bulan ini", phrase: "bulan ini", title: `${monthName} ${year}` },
    { key: "tahun", label: `Tahun ${year}`, phrase: "tahun ini", title: `tahun ${year}` },
    { key: "semua", label: "Sepanjang waktu", phrase: "sepanjang waktu", title: "sepanjang waktu" },
  ];
}

/** Buku di rak anggota, sebagaimana tampil di punggung buku. */
export type ShelfBook = { title: string; bg: string; ink: string; slug: string };

/** Anggota di papan baca, dihitung dari database. */
export type Member = {
  id: string;
  name: string;
  first: string;
  since: string;
  look: AvatarLook;
  fav: string | null;
  reading: ShelfBook | null;
  counts: Record<Period, number>;
  bio: string;
  books: ShelfBook[];
};

/** Anggota yang sedang masuk. Nama dan penampilannya mengikuti pilihan karakter di Profil. */
export const ME_ID = "me";

export const MEMBERS: Array<Omit<SampleMember, "name" | "first" | "look"> & Partial<Pick<SampleMember, "name" | "first" | "look">>> = [
  {
    id: "sekar",
    name: "Sekar Ayuningtyas",
    first: "Sekar",
    since: "2022",
    look: { type: "bob", skin: "#D9A27C", hair: "#3A2A22", shirt: "#74678F" },
    fav: "Puisi",
    reading: "lampion",
    counts: { bulan: 4, tahun: 21, semua: 64 },
    bio: "Membaca puisi setiap pagi sebelum berangkat kerja, dan selalu menyelipkan pembatas dari daun kering.",
    books: ["lampion", "kota", "kebun", "mercu", "surat", "awan", "teh"],
  },
  {
    id: "bagas",
    name: "Bagas Wicaksono",
    first: "Bagas",
    since: "2023",
    look: { type: "short", skin: "#A8704A", hair: "#1F1A17", shirt: "#4F6F66" },
    fav: "Sejarah",
    reading: "angin",
    counts: { bulan: 3, tahun: 18, semua: 52 },
    bio: "Penggemar sejarah pelayaran. Sedang menyusun peta jalur rempah versinya sendiri.",
    books: ["angin", "teh", "kota", "laut", "kemarau", "peta"],
  },
  {
    id: "nadine",
    name: "Nadine Hapsari",
    first: "Nadine",
    since: "2023",
    look: { type: "bob", skin: "#C68B62", hair: "#5A3A2A", shirt: "#5C7395", glasses: true },
    fav: "Sains",
    reading: "akar",
    counts: { bulan: 2, tahun: 16, semua: 41 },
    bio: "Guru biologi yang suka membaca buku sains populer bersama murid-muridnya.",
    books: ["akar", "laut", "awan", "mercu", "kebun"],
  },
  {
    id: "yusuf",
    name: "Yusuf Ramadhan",
    first: "Yusuf",
    since: "2024",
    look: { type: "short", skin: "#C68B62", hair: "#2B211B", shirt: "#8F7358", glasses: true },
    fav: "Fiksi",
    reading: "kemarau",
    counts: { bulan: 3, tahun: 13, semua: 30 },
    bio: "Membaca novel di kereta setiap perjalanan pulang kerja.",
    books: ["kemarau", "kebun", "surat", "kota", "peta"],
  },
  {
    id: "melati",
    name: "Melati Kusuma",
    first: "Melati",
    since: "2022",
    look: { type: "hijab", skin: "#D9A27C", shirt: "#5C7395", hijab: "#9AAE8E", hijabShade: "#879C7B" },
    fav: "Anak",
    reading: "peta",
    counts: { bulan: 1, tahun: 11, semua: 38 },
    bio: "Ibu dua anak. Setiap malam membacakan satu cerita sebelum tidur.",
    books: ["peta", "awan", "lampion", "kebun"],
  },
  {
    id: "arif",
    name: "Arif Nugroho",
    first: "Arif",
    since: "2025",
    look: { type: "short", skin: "#8E5B3A", hair: "#1F1A17", shirt: "#2F4A5C", glasses: true },
    fav: "Sains",
    reading: "laut",
    counts: { bulan: 2, tahun: 7, semua: 15 },
    bio: "Mahasiswa oseanografi yang baru jatuh cinta pada buku nonfiksi.",
    books: ["laut", "akar", "awan"],
  },
  {
    id: "putri",
    name: "Putri Larasati",
    first: "Putri",
    since: "2023",
    look: { type: "hijab", skin: "#C68B62", shirt: "#4F6F66", hijab: "#D2AFA8", hijabShade: "#BF9A92" },
    fav: "Puisi",
    reading: "lampion",
    counts: { bulan: 0, tahun: 6, semua: 22 },
    bio: "Menyalin kutipan favorit ke buku catatan kecil yang selalu ia bawa.",
    books: ["lampion", "kota", "surat"],
  },
  {
    id: "hendra",
    name: "Hendra Saputra",
    first: "Hendra",
    since: "2025",
    look: { type: "short", skin: "#A8704A", hair: "#2B211B", shirt: "#B9997A" },
    fav: "Sejarah",
    reading: "teh",
    counts: { bulan: 2, tahun: 5, semua: 9 },
    bio: "Pemilik warung kopi yang penasaran pada sejarah setiap minuman yang ia sajikan.",
    books: ["teh", "angin", "kemarau"],
  },
  {
    id: ME_ID,
    since: "2024",
    fav: "Fiksi",
    reading: "kebun",
    counts: { bulan: 1, tahun: 4, semua: 19 },
    bio: "Suka novel yang pelan, buku tentang laut, dan secangkir teh hangat sebelum tidur.",
    books: ["laut", "teh", "kebun", "peta"],
  },
  {
    id: "laila",
    name: "Laila Fitri",
    first: "Laila",
    since: "2024",
    look: { type: "hijab", skin: "#D9A27C", shirt: "#74678F", hijab: "#8FA4BF", hijabShade: "#7E93AE" },
    fav: "Fiksi",
    reading: "mercu",
    counts: { bulan: 1, tahun: 3, semua: 12 },
    bio: "Baru mulai rutin membaca lagi tahun ini, satu bab setiap hari.",
    books: ["mercu", "kebun", "surat"],
  },
  {
    id: "tegar",
    name: "Tegar Mahendra",
    first: "Tegar",
    since: "2025",
    look: { type: "short", skin: "#C68B62", hair: "#2B211B", shirt: "#D9A77E" },
    fav: "Anak",
    reading: "peta",
    counts: { bulan: 0, tahun: 2, semua: 6 },
    bio: "Mahasiswa baru yang sedang mengumpulkan lagi buku petualangan favorit masa kecilnya.",
    books: ["peta", "awan"],
  },
];

/** Sumbangan terbaru dari anggota (data contoh). */
export const RECENT_DONATIONS = [
  { title: "Rumah Lampu di Pesisir", by: "Sekar", date: "3 Okt", bg: "#8FA4BF" },
  { title: "Catatan Musim Kemarau", by: "Yusuf", date: "28 Sep", bg: "#D9A77E" },
  { title: "Ensiklopedia Kecil Awan", by: "Nadine", date: "21 Sep", bg: "#9AAE8E" },
  { title: "Lagu untuk Kota Tua", by: "Bagas", date: "14 Sep", bg: "#7A5A4E" },
];
