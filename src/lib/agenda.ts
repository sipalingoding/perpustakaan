/** Empat agenda kopi darat Lembar bersama @kopiku_literasi. Urutan di sini = urutan di halaman Agenda. */
export const AGENDA_KINDS = ["tanpa-gadget", "basa-basi", "kkn", "ngopi"] as const;
export type AgendaKind = (typeof AGENDA_KINDS)[number];

export const PARTNER = { handle: "@kopiku_literasi", url: "https://www.instagram.com/kopiku_literasi/" } as const;

export type AgendaInfo = {
  /** Nama pendek untuk tabel, notifikasi, dan tiket. */
  name: string;
  /** Kepanjangan atau keterangan di bawah nama. */
  tagline: string;
  about: string;
  /** Jalannya acara, berurutan. */
  flow: string[];
  bring: string;
  /** Warna identitas agenda: latar kartu dan tinta di atasnya. */
  tone: { bg: string; ink: string; soft: string };
};

export const AGENDA: Record<AgendaKind, AgendaInfo> = {
  "tanpa-gadget": {
    name: "2 Jam Tanpa Gadget",
    tagline: "Baca buku bareng",
    about:
      "Ponsel dititipkan di keranjang selama dua jam. Semua membaca bukunya masing-masing di ruangan yang sama, tanpa notifikasi yang memotong halaman.",
    flow: ["Ponsel masuk keranjang", "Dua jam membaca dalam hening", "Yang mau boleh cerita singkat soal bacaannya"],
    bring: "Buku apa saja. Belum punya? Pinjam dari rak Lembar di tempat.",
    tone: { bg: "#2E5A52", ink: "#F8F7F1", soft: "#DFE7E0" },
  },
  "basa-basi": {
    name: "Basa-Basi",
    tagline: "Bahas santai, baca puisi",
    about:
      "Obrolan ringan soal buku dan puisi yang sedang disukai, lalu bergiliran membacakan puisi: karya sendiri atau karya penyair favorit. Tidak ada yang dinilai, dan yang hanya ingin mendengarkan juga dipersilakan.",
    flow: ["Obrolan pembuka", "Giliran membaca puisi", "Saling menanggapi"],
    bring: "Satu puisi yang ingin kamu bacakan, kalau ada.",
    tone: { bg: "#5E4F7A", ink: "#FBF7EF", soft: "#E6E1EE" },
  },
  kkn: {
    name: "KKN",
    tagline: "Kuy Kita Nulis",
    about:
      "Menulis bersama dari satu pemantik yang dibagikan di awal sesi. Ada waktu menulis dalam hening, lalu yang berkenan membacakan tulisannya untuk ditanggapi teman-teman.",
    flow: ["Pemantik dibagikan", "Menulis dalam hening", "Membacakan dan menanggapi"],
    bring: "Buku catatan dan pena, atau laptop.",
    tone: { bg: "#9A5B3B", ink: "#FBF7EF", soft: "#F3E3D3" },
  },
  ngopi: {
    name: "Ngopi",
    tagline: "Ngobrol Pintar",
    about:
      "Diskusi santai satu topik: dari buku, kejadian di sekitar, atau pengalaman membaca. Satu teman memantik obrolan, lalu semua boleh menimpali sambil ngopi.",
    flow: ["Topik dibuka pemantik", "Diskusi bebas", "Catatan penutup bersama"],
    bring: "Rasa penasaran. Topiknya diumumkan di catatan jadwal.",
    tone: { bg: "#34507A", ink: "#F8F7F1", soft: "#DDE5EF" },
  },
};

/** Batas foto dokumentasi per agenda. */
export const MAX_AGENDA_PHOTOS = 12;
