/**
 * Data contoh katalog. Semua judul, penulis, dan isinya fiktif.
 * Ganti dengan data dari basis data atau API saat aplikasi sudah tersambung.
 */

export type Category = "Fiksi" | "Sains" | "Sejarah" | "Puisi" | "Anak" | "Lainnya";
export type Motif = "rain" | "moon" | "waves" | "cup" | "ripple" | "lantern" | "wind" | "leaf";

export type ReaderPage =
  | { kind: "title" }
  | { kind: "text"; eyebrow?: string; heading?: string; body: string; folio: string }
  | { kind: "end"; title: string; body: string };

/** Pasangan halaman kiri–kanan. Halaman kiri spread pertama adalah sampul dalam. */
export type Spread = [ReaderPage | null, ReaderPage];

export type Book = {
  slug: string;
  title: string;
  author: string;
  category: Category;
  form: string;
  cover: { bg: string; ink: string };
  motif: Motif;
  /**
   * "saya" = sedang dipinjam anggota yang masuk; "dipinjam" = semua eksemplar dipegang anggota lain;
   * "terbooking" = dibooking (belum diambil), oleh anggota yang masuk (`bookedByMe`) atau semua eksemplar oleh orang lain.
   */
  status: "tersedia" | "saya" | "dipinjam" | "terbooking";
  bookedByMe?: boolean;
  /** Berapa kali buku ini sudah dipinjam (diambil anggota), dari semua eksemplarnya. */
  timesBorrowed?: number;
  /** Rata-rata bintang (1–5) dan jumlah ulasan pembaca; count 0 = belum ada ulasan. */
  rating?: { avg: number; count: number };
  due?: string;
  tags: string;
  synopsis: string;
  pages: number | null;
  year: number | null;
  shelf: string;
  copies: { total: number; available: number };
  spreads: Spread[];
  isbn?: string | null;
  publisher?: string;
  language?: string;
  /** Alamat gambar sampul; kosong = sampul ilustrasi dari `cover` dan `motif`. */
  coverImage?: string | null;
};

export const titleOnly = (note: string): Spread[] => [
  [null, { kind: "title" }],
  [
    { kind: "text", eyebrow: "Catatan", heading: "Belum ada cuplikan", body: note, folio: "" },
    { kind: "end", title: "Pinjam untuk membaca", body: "Cuplikan buku ini belum tersedia di Lembar." },
  ],
];

export const BOOKS: Book[] = [
  {
    slug: "kebun-di-ujung-hujan",
    title: "Kebun di Ujung Hujan",
    author: "Laras Wening",
    category: "Fiksi",
    form: "Novel",
    cover: { bg: "#4F6F66", ink: "#F3F1E7" },
    motif: "rain",
    status: "saya",
    due: "12 Okt",
    tags: "hujan kebun ibu desa",
    synopsis:
      "Di desa yang hujannya selalu datang terlambat, seorang anak mencatat nama setiap tanaman di kebun ibunya sebelum kemarau sempat menghapusnya.",
    pages: 186,
    year: 2024,
    shelf: "F-03",
    copies: { total: 2, available: 1 },
    spreads: titleOnly("Penerbit belum mengizinkan cuplikan untuk buku ini. Kamu tetap bisa meminjamnya."),
  },
  {
    slug: "peta-bintang-nenek",
    title: "Peta Bintang Nenek",
    author: "Bima Aryasatya",
    category: "Anak",
    form: "Buku bergambar",
    cover: { bg: "#2F4A5C", ink: "#F1E3C8" },
    motif: "moon",
    status: "saya",
    due: "15 Okt",
    tags: "bintang langit malam nenek",
    synopsis:
      "Setiap malam, nenek menggambar rasi bintang di langit-langit kamar dengan senter. Cerita bergambar tentang rasa ingin tahu dan cara kecil untuk mengingat orang tersayang.",
    pages: 64,
    year: 2023,
    shelf: "A-11",
    copies: { total: 1, available: 0 },
    spreads: titleOnly("Buku bergambar ini paling enak dibaca langsung di halaman aslinya."),
  },
  {
    slug: "surat-dari-teluk-sunyi",
    title: "Surat dari Teluk Sunyi",
    author: "Ratri Anggun",
    category: "Fiksi",
    form: "Novel",
    cover: { bg: "#E3BE9C", ink: "#3A2E26" },
    motif: "waves",
    status: "tersedia",
    tags: "laut teluk surat pos",
    synopsis:
      "Di sebuah teluk kecil yang hanya disinggahi kapal sekali seminggu, seorang anak perempuan membantu tukang pos tua menyortir surat-surat tanpa alamat. Novel yang lembut tentang kehilangan, kesabaran, dan kata-kata yang menunggu untuk sampai.",
    pages: 212,
    year: 2025,
    shelf: "F-07",
    copies: { total: 2, available: 1 },
    spreads: [
      [null, { kind: "title" }],
      [
        {
          kind: "text",
          eyebrow: "Bab satu",
          heading: "Kantor Pos di Ujung Dermaga",
          folio: "1",
          body: "Kantor pos di teluk kami hanya buka setiap Kamis, ketika kapal pengangkut garam singgah sebentar sebelum melanjutkan perjalanan ke utara. Pada hari-hari lain pintunya dikunci, dan kuncinya tergantung di leher Pak Darsa.",
        },
        {
          kind: "text",
          folio: "2",
          body: "Aku berusia sebelas tahun ketika ia memberiku pekerjaan pertamaku: menyortir surat yang tak beralamat. Jumlahnya selalu lebih banyak dari yang kubayangkan. Orang-orang di teluk ini rupanya gemar menulis kepada seseorang yang tak mereka ketahui tinggal di mana.",
        },
      ],
      [
        {
          kind: "text",
          folio: "3",
          body: "Surat-surat itu kami simpan dalam peti kayu di bawah meja. Setiap senja, Pak Darsa membuka satu, membacanya pelan-pelan, lalu melipatnya kembali dengan sangat hati-hati, seolah kata-kata di dalamnya bisa tumpah bila ia ceroboh.",
        },
        {
          kind: "end",
          title: "Cuplikan berakhir di sini.",
          body: "Pinjam bukunya untuk membaca kelanjutan kisah dari teluk ini.",
        },
      ],
    ],
  },
  {
    slug: "sejarah-kecil-secangkir-teh",
    title: "Sejarah Kecil Secangkir Teh",
    author: "Dimas Pramudya",
    category: "Sejarah",
    form: "Nonfiksi",
    cover: { bg: "#B9C7B0", ink: "#23332D" },
    motif: "cup",
    status: "tersedia",
    tags: "teh kebun dagang",
    synopsis:
      "Menelusuri perjalanan teh dari kebun di lereng gunung hingga meja makan, lewat kisah para pemetik, pedagang, dan peminumnya.",
    pages: 248,
    year: 2022,
    shelf: "S-14",
    copies: { total: 2, available: 2 },
    spreads: titleOnly("Cuplikan buku ini sedang disiapkan oleh pustakawan."),
  },
  {
    slug: "mengukur-laut",
    title: "Mengukur Laut",
    author: "Nadia Kirana",
    category: "Sains",
    form: "Sains populer",
    cover: { bg: "#5C7395", ink: "#F6F4EC" },
    motif: "ripple",
    status: "dipinjam",
    due: "18 Okt",
    tags: "laut samudra gelombang",
    synopsis:
      "Pengantar ramah tentang cara ilmuwan mengukur kedalaman, arus, dan suhu laut, dari tali pemberat hingga satelit.",
    pages: 230,
    year: 2024,
    shelf: "N-05",
    copies: { total: 1, available: 0 },
    spreads: titleOnly("Cuplikan buku ini sedang disiapkan oleh pustakawan."),
  },
  {
    slug: "seribu-lampion-kertas",
    title: "Seribu Lampion Kertas",
    author: "Ayu Lestiani",
    category: "Puisi",
    form: "Kumpulan puisi",
    cover: { bg: "#74678F", ink: "#FBF7EF" },
    motif: "lantern",
    status: "tersedia",
    tags: "puisi cahaya malam",
    synopsis: "Kumpulan puisi pendek tentang malam, cahaya-cahaya kecil, dan orang-orang yang pulang.",
    pages: 96,
    year: 2025,
    shelf: "P-02",
    copies: { total: 1, available: 1 },
    spreads: titleOnly("Cuplikan buku ini sedang disiapkan oleh pustakawan."),
  },
  {
    slug: "arsip-angin-barat",
    title: "Arsip Angin Barat",
    author: "Galih Saputra",
    category: "Sejarah",
    form: "Nonfiksi",
    cover: { bg: "#C9D3D9", ink: "#22323A" },
    motif: "wind",
    status: "tersedia",
    tags: "angin pelayaran musim",
    synopsis:
      "Catatan sejarah pelayaran yang bergantung pada angin musim, disusun dari surat-surat nakhoda dan buku log kapal.",
    pages: 312,
    year: 2021,
    shelf: "S-09",
    copies: { total: 1, available: 1 },
    spreads: titleOnly("Cuplikan buku ini sedang disiapkan oleh pustakawan."),
  },
  {
    slug: "akar-yang-bernyanyi",
    title: "Akar yang Bernyanyi",
    author: "Sekar Mayang",
    category: "Sains",
    form: "Sains populer",
    cover: { bg: "#2E4A43", ink: "#E7D8B8" },
    motif: "leaf",
    status: "dipinjam",
    due: "21 Okt",
    tags: "tumbuhan akar hutan",
    synopsis:
      "Bagaimana tumbuhan berkomunikasi lewat akar dan jamur di bawah tanah, diceritakan dengan bahasa yang mudah diikuti.",
    pages: 204,
    year: 2023,
    shelf: "N-12",
    copies: { total: 1, available: 0 },
    spreads: titleOnly("Cuplikan buku ini sedang disiapkan oleh pustakawan."),
  },
];

export const CATEGORIES: Category[] = ["Fiksi", "Sains", "Sejarah", "Puisi", "Anak", "Lainnya"];

export function getBook(slug: string) {
  return BOOKS.find((b) => b.slug === slug);
}

/**
 * Semua judul yang muncul di rak anggota, termasuk beberapa yang belum ada di katalog.
 * `slug` diisi bila bukunya punya halaman detail.
 */
export const SHELF_TITLES = {
  kebun: { title: "Kebun di Ujung Hujan", bg: "#4F6F66", ink: "#F3F1E7", slug: "kebun-di-ujung-hujan" },
  peta: { title: "Peta Bintang Nenek", bg: "#2F4A5C", ink: "#F1E3C8", slug: "peta-bintang-nenek" },
  surat: { title: "Surat dari Teluk Sunyi", bg: "#E3BE9C", ink: "#3A2E26", slug: "surat-dari-teluk-sunyi" },
  teh: { title: "Sejarah Kecil Secangkir Teh", bg: "#B9C7B0", ink: "#23332D", slug: "sejarah-kecil-secangkir-teh" },
  laut: { title: "Mengukur Laut", bg: "#5C7395", ink: "#F6F4EC", slug: "mengukur-laut" },
  lampion: { title: "Seribu Lampion Kertas", bg: "#74678F", ink: "#FBF7EF", slug: "seribu-lampion-kertas" },
  angin: { title: "Arsip Angin Barat", bg: "#C9D3D9", ink: "#22323A", slug: "arsip-angin-barat" },
  akar: { title: "Akar yang Bernyanyi", bg: "#2E4A43", ink: "#E7D8B8", slug: "akar-yang-bernyanyi" },
  mercu: { title: "Rumah Lampu di Pesisir", bg: "#8FA4BF", ink: "#1D2B28", slug: undefined },
  kemarau: { title: "Catatan Musim Kemarau", bg: "#D9A77E", ink: "#3A2E26", slug: undefined },
  awan: { title: "Ensiklopedia Kecil Awan", bg: "#9AAE8E", ink: "#1D2B28", slug: undefined },
  kota: { title: "Lagu untuk Kota Tua", bg: "#7A5A4E", ink: "#F3EBDD", slug: undefined },
} satisfies Record<string, { title: string; bg: string; ink: string; slug: string | undefined }>;

export type ShelfKey = keyof typeof SHELF_TITLES;

/** Tinggi punggung buku mengikuti panjang judul, supaya rak terlihat alami. */
export function spineHeight(title: string, index: number) {
  return Math.round(56 + title.length * 8.2 + (index % 3) * 12);
}
