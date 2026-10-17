import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AvatarLook } from "@/components/Avatar";
import type { Spread } from "@/lib/books";

/* ------------------------------------------------------------------ */
/* Akun                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Data anggota di aplikasi. Login, kata sandi, dan sesi ada di Neon Auth (schema neon_auth);
 * id di sini sama dengan id akun Neon Auth, dan barisnya dibuat saat akun pertama kali masuk.
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Katalog                                                              */
/* ------------------------------------------------------------------ */

/** Kategori buku, dikelola pustakawan di /admin/kategori. Namanya dipakai langsung sebagai kunci di buku dan sumbangan. */
export const categories = pgTable(
  "categories",
  {
    name: text("name").primaryKey(),
    /** Warna sampul ilustrasi bawaan untuk buku kategori ini (buku sumbangan tanpa sampul, pratinjau sumbangan). */
    coverBg: text("cover_bg").notNull(),
    coverInk: text("cover_ink").notNull(),
    /** Urutan tampil di filter katalog dan pilihan kategori: makin kecil makin awal. */
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("categories_name_length", sql`char_length(${t.name}) between 1 and 30`)],
);

export const motif = pgEnum("motif", ["rain", "moon", "waves", "cup", "ripple", "lantern", "wind", "leaf"]);

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    category: text("category")
      .notNull()
      .references(() => categories.name, { onUpdate: "cascade", onDelete: "restrict" }),
    form: text("form").notNull(),
    coverBg: text("cover_bg").notNull(),
    coverInk: text("cover_ink").notNull(),
    motif: motif("motif").notNull().default("leaf"),
    tags: text("tags").notNull().default(""),
    synopsis: text("synopsis").notNull().default(""),
    /** Kosong bila belum diketahui (mis. buku sumbangan yang belum dilengkapi pustakawan). */
    pages: integer("pages"),
    year: integer("year"),
    shelf: text("shelf").notNull(),
    isbn: text("isbn"),
    publisher: text("publisher").notNull().default(""),
    language: text("language").notNull().default("Indonesia"),
    /** Kunci gambar sampul di bucket uploads (covers/<book>/<uuid>.jpg); kosong = sampul ilustrasi. */
    coverKey: text("cover_key"),
    /** Urutan di "Pilihan pustakawan": makin kecil makin awal. */
    position: integer("position").notNull().default(0),
    /** Cuplikan yang bisa dibaca di halaman detail. */
    spreads: jsonb("spreads").$type<Spread[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("books_category_idx").on(t.category),
    uniqueIndex("books_isbn_unique").on(t.isbn),
    check("books_pages_positive", sql`${t.pages} is null or ${t.pages} > 0`),
  ],
);


/** Satu baris per eksemplar fisik. Ketersediaan buku dihitung dari pinjaman aktif pada eksemplarnya. */
export const bookCopies = pgTable(
  "book_copies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
  },
  (t) => [index("book_copies_book_idx").on(t.bookId)],
);

/* ------------------------------------------------------------------ */
/* Anggota                                                              */
/* ------------------------------------------------------------------ */

export const gender = pgEnum("gender", ["perempuan", "laki-laki"]);
/** Pustakawan bisa membuka /admin untuk mengelola koleksi. */
export const role = pgEnum("role", ["anggota", "pustakawan"]);

export type Notifications = { due: boolean; fav: boolean };

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    /** Nomor kartu anggota, urut otomatis. Tampil sebagai LMB-YYMM-NNNN. */
    memberNo: integer("member_no").notNull().unique().generatedAlwaysAsIdentity(),
    nickname: text("nickname").notNull(),
    gender: gender("gender").notNull().default("perempuan"),
    role: role("role").notNull().default("anggota"),
    /** Kosong = pakai tampilan bawaan sesuai jenis kelamin. */
    avatarLook: jsonb("avatar_look").$type<AvatarLook>(),
    /** Kunci foto profil di bucket uploads (avatars/<user>/<uuid>.jpg); kosong = belum pernah mengunggah. */
    photoKey: text("photo_key"),
    /** Foto unggahan dipakai menggantikan ilustrasi karakter. */
    usePhoto: boolean("use_photo").notNull().default(false),
    bio: text("bio").notNull().default(""),
    phone: text("phone"),
    /** Target jumlah buku yang dibaca tahun ini. */
    readingGoal: integer("reading_goal").notNull().default(12),
    /** Nama kategori; diperbarui saat pustakawan mengganti nama atau menghapus kategori. */
    favCategories: text("fav_categories").array().notNull().default(sql`'{}'`),
    notifications: jsonb("notifications")
      .$type<Notifications>()
      .notNull()
      .default({ due: true, fav: true }),
    /** Buku yang sedang dibaca, ditampilkan di papan baca. */
    readingBookId: uuid("reading_book_id").references(() => books.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("profiles_goal_range", sql`${t.readingGoal} between 1 and 365`)],
);


/* ------------------------------------------------------------------ */
/* Peminjaman                                                           */
/* ------------------------------------------------------------------ */

export const loanStatus = pgEnum("loan_status", ["reserved", "active", "returned", "cancelled"]);

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    copyId: uuid("copy_id")
      .notNull()
      .references(() => bookCopies.id, { onDelete: "restrict" }),
    status: loanStatus("status").notNull(),
    /** Tanggal ambil di perpustakaan. Saat pustakawan menyetujui pengambilan, diganti ke tanggal buku benar-benar diambil. */
    startOn: date("start_on", { mode: "string" }).notNull(),
    /** Jam kedatangan untuk mengambil buku (awal slot satu jam, waktu Jakarta). Kosong untuk pinjaman lama. */
    pickupHour: smallint("pickup_hour"),
    /** Halaman terakhir yang dibaca anggota (tracker bacaan di Profil). Kosong = belum dicatat. */
    currentPage: integer("current_page"),
    dueOn: date("due_on", { mode: "string" }).notNull(),
    returnedOn: date("returned_on", { mode: "string" }),
    /**
     * Anggota menekan "Kembalikan buku" (dan mengisi ulasan). Status tetap "active" dan eksemplar tetap dipegang
     * sampai pustakawan menerima bukunya di meja sirkulasi; baru saat itu status jadi "returned".
     */
    returnRequestedAt: timestamp("return_requested_at", { withTimezone: true }),
    /** Sudah diperpanjang atau belum: satu kali, 7 hari. */
    extensions: integer("extensions").notNull().default(0),
    /**
     * Jatuh tempo yang sudah diingatkan lewat email/WhatsApp. Dibandingkan dengan due_on, jadi pinjaman yang
     * diperpanjang mendapat pengingat lagi untuk tanggal barunya.
     */
    remindedFor: date("reminded_for", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("loans_pickup_hour_range", sql`${t.pickupHour} is null or ${t.pickupHour} between 0 and 23`),
    check("loans_current_page_range", sql`${t.currentPage} is null or ${t.currentPage} >= 0`),
    // Satu eksemplar hanya boleh dipegang satu anggota pada satu waktu.
    uniqueIndex("loans_one_holder_per_copy")
      .on(t.copyId)
      .where(sql`${t.status} in ('reserved', 'active')`),
    index("loans_user_status_idx").on(t.userId, t.status),
    index("loans_due_idx").on(t.dueOn),
    check("loans_dates_order", sql`${t.dueOn} > ${t.startOn}`),
    check("loans_extensions_range", sql`${t.extensions} between 0 and 1`),
  ],
);

/* ------------------------------------------------------------------ */
/* Sumbangan                                                            */
/* ------------------------------------------------------------------ */

export const bookCondition = pgEnum("book_condition", ["baru", "sangat", "baik"]);
export const donationMethod = pgEnum("donation_method", ["antar", "jemput"]);
/** diajukan (anggota mengisi formulir) -> dikirim (disetujui pustakawan, buku dalam pengiriman) -> diterima (buku sudah di tangan petugas). */
export const donationStatus = pgEnum("donation_status", ["diajukan", "dikirim", "diterima", "ditolak"]);

export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Kode tanda terima yang ditunjukkan ke petugas, mis. SB-1008-0001. */
    code: text("code").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    title: text("title").notNull(),
    author: text("author").notNull(),
    category: text("category")
      .notNull()
      .references(() => categories.name, { onUpdate: "cascade", onDelete: "restrict" }),
    condition: bookCondition("condition").notNull(),
    qty: integer("qty").notNull().default(1),
    note: text("note").notNull().default(""),
    method: donationMethod("method").notNull(),
    address: text("address"),
    scheduledOn: date("scheduled_on", { mode: "string" }).notNull(),
    /** Jam antar/jemput (awal slot satu jam, waktu Jakarta). Kosong untuk sumbangan lama yang belum memilih jam. */
    scheduledHour: smallint("scheduled_hour"),
    /** Data dari katalog publik bila penyumbang memilih bukunya lewat pencarian; dipakai saat buku masuk koleksi. */
    isbn: text("isbn"),
    publisher: text("publisher"),
    year: integer("year"),
    pages: integer("pages"),
    language: text("language"),
    coverUrl: text("cover_url"),
    /** Kunci karya di Open Library ("/works/OL…W"), untuk mengambil sinopsis saat buku diterima. */
    sourceRef: text("source_ref"),
    /** Buku di koleksi yang dibuat atau ditambah eksemplarnya saat sumbangan diterima. */
    bookId: uuid("book_id").references(() => books.id, { onDelete: "set null" }),
    /** Tampilkan nama penyumbang di plakat ex libris. */
    showName: boolean("show_name").notNull().default(true),
    status: donationStatus("status").notNull().default("diajukan"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("donations_user_idx").on(t.userId),
    index("donations_created_idx").on(t.createdAt),
    check("donations_qty_range", sql`${t.qty} between 1 and 20`),
    check("donations_hour_range", sql`${t.scheduledHour} is null or ${t.scheduledHour} between 0 and 23`),
    check("donations_note_length", sql`char_length(${t.note}) <= 120`),
    check("donations_pickup_address", sql`${t.method} <> 'jemput' or coalesce(char_length(trim(${t.address})), 0) > 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* Notifikasi                                                           */
/* ------------------------------------------------------------------ */

/** Jenis notifikasi; menentukan ikon di daftar notifikasi. */
export const notificationKind = pgEnum("notification_kind", ["peminjaman", "sumbangan", "agenda", "buku"]);

/** Kabar perubahan status untuk anggota (booking, pengambilan, pembatalan, sumbangan). Tampil di lonceng header. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    kind: notificationKind("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Halaman tujuan saat notifikasi diklik. */
    href: text("href"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Kapan dibaca; kosong = belum dibaca. */
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Agenda kopi darat bersama @kopiku_literasi                           */
/* ------------------------------------------------------------------ */

/** Empat agenda tetap; nama dan penjelasannya ada di src/lib/agenda.ts. */
export const agendaKind = pgEnum("agenda_kind", ["tanpa-gadget", "basa-basi", "kkn", "ngopi"]);

/** Satu pertemuan terjadwal. Diisi pustakawan dari /admin/agenda. */
export const agendaEvents = pgTable(
  "agenda_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: agendaKind("kind").notNull(),
    /** Tanggal dan jam menurut waktu Jakarta. */
    date: date("date", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    place: text("place").notNull(),
    /** Jumlah kursi; kosong = tanpa batas. */
    capacity: integer("capacity"),
    /** Catatan singkat untuk peserta, mis. tema atau yang perlu dibawa. */
    note: text("note").notNull().default(""),
    /** Poster acara (opsional) di bucket uploads: agenda/poster/<uuid>.jpg, beserta ukurannya. */
    posterKey: text("poster_key"),
    posterWidth: integer("poster_width"),
    posterHeight: integer("poster_height"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agenda_events_date_idx").on(t.date),
    check("agenda_events_time_order", sql`${t.endTime} > ${t.startTime}`),
    check("agenda_events_capacity_range", sql`${t.capacity} is null or ${t.capacity} between 1 and 500`),
    check("agenda_events_note_length", sql`char_length(${t.note}) <= 280`),
  ],
);

/** Anggota yang mendaftar ikut satu pertemuan. */
export const agendaRegistrations = pgTable(
  "agenda_registrations",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => agendaEvents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index("agenda_registrations_user_idx").on(t.userId)],
);

/** Dokumentasi kegiatan per agenda, diunggah pustakawan. Berkasnya di bucket uploads (agenda/<kind>/<uuid>.jpg). */
export const agendaPhotos = pgTable(
  "agenda_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: agendaKind("kind").notNull(),
    fileKey: text("file_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    caption: text("caption").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agenda_photos_kind_idx").on(t.kind, t.createdAt),
    check("agenda_photos_caption_length", sql`char_length(${t.caption}) <= 140`),
  ],
);

/* ------------------------------------------------------------------ */
/* Ulasan buku                                                          */
/* ------------------------------------------------------------------ */

/** Ulasan dan rating (1–5 bintang) dari pembaca, diisi saat mengembalikan buku. Satu ulasan per anggota per buku. */
export const bookReviews = pgTable(
  "book_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    /** Pinjaman terakhir yang menghasilkan ulasan ini. */
    loanId: uuid("loan_id").references(() => loans.id, { onDelete: "set null" }),
    rating: smallint("rating").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("book_reviews_one_per_reader").on(t.bookId, t.userId),
    index("book_reviews_book_idx").on(t.bookId, t.updatedAt),
    check("book_reviews_rating_range", sql`${t.rating} between 1 and 5`),
    check("book_reviews_body_length", sql`char_length(${t.body}) <= 1000`),
  ],
);

/* ------------------------------------------------------------------ */
/* Status layanan                                                       */
/* ------------------------------------------------------------------ */

/**
 * Satu baris (id = 1): pustakawan menutup perpustakaan secara manual, mis. libur atau keperluan mendadak.
 * Selama `closed`, status di katalog "Tutup" walau masih jam layanan, sampai pustakawan membukanya lagi.
 */
export const libraryStatus = pgTable(
  "library_status",
  {
    id: smallint("id").primaryKey().default(1),
    closed: boolean("closed").notNull().default(false),
    /** Keterangan untuk anggota, mis. "Libur Idul Fitri". Boleh kosong. */
    note: text("note").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("library_status_single_row", sql`${t.id} = 1`),
    check("library_status_note_length", sql`char_length(${t.note}) <= 120`),
  ],
);
