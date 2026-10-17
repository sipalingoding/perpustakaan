/**
 * Mengisi database lokal dengan data contoh dari src/lib (katalog, anggota fiktif, pinjaman).
 *
 *   npm run db:seed            isi database kosong
 *   npm run db:seed -- --reset hapus semua isi lalu isi ulang
 *
 * Hanya untuk pengembangan. Katalog dan anggota di sini fiktif; data produksi harus diisi pustakawan.
 * Tanggal digeser mengikuti hari ini, jadi "jatuh tempo 7 hari lagi" tetap berlaku kapan pun skrip dijalankan.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { BOOKS, SHELF_TITLES, type ShelfKey } from "@/lib/books";
import { DAY, TODAY } from "@/lib/dates";
import { LOANS } from "@/lib/loans";
import { MEMBERS, RECENT_DONATIONS } from "@/lib/members";

if (process.env.NODE_ENV === "production") {
  console.error("Seed ditolak: NODE_ENV=production. Skrip ini hanya untuk pengembangan.");
  process.exit(1);
}

// Seed mengisi data contoh dan --reset mengosongkan semua tabel: jangan pernah ke database Neon (produksi).
if (/\.neon\.tech/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Seed ditolak: DATABASE_URL menunjuk ke Neon. Seed hanya untuk database lokal.");
  process.exit(1);
}

const reset = process.argv.includes("--reset");
const DEMO_EMAIL = "rani@contoh.id";

/* ---------- tanggal ---------- */
const now = new Date();
const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
const shift = todayMs - TODAY;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** Tanggal contoh (ms UTC) digeser ke kalender sekarang. */
const moved = (ms: number) => iso(ms + shift);
const monthStart = Date.UTC(now.getFullYear(), now.getMonth(), 1);
const yearStart = Date.UTC(now.getFullYear(), 0, 1);

const MALE = new Set(["bagas", "yusuf", "arif", "hendra", "tegar"]);
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

async function main() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.books);
  if (n > 0 && !reset) {
    console.error(`Database sudah berisi ${n} buku. Jalankan dengan --reset untuk mengisi ulang.`);
    process.exit(1);
  }
  if (reset) {
    await db.execute(
      sql`truncate table ${s.loans}, ${s.donations}, ${s.profiles}, ${s.bookCopies}, ${s.books}, ${s.user} restart identity cascade`,
    );
  }

  /* ---------- kategori (migrasi 0017 sudah mengisinya; diisi ulang bila pustakawan sempat menghapus) ---------- */
  await db
    .insert(s.categories)
    .values(
      [
        ["Fiksi", "#4F6F66", "#F3F1E7"],
        ["Sains", "#5C7395", "#F6F4EC"],
        ["Sejarah", "#B9C7B0", "#23332D"],
        ["Puisi", "#74678F", "#FBF7EF"],
        ["Anak", "#E3BE9C", "#3A2E26"],
        ["Lainnya", "#C9D3D9", "#22323A"],
      ].map(([name, coverBg, coverInk], position) => ({ name, coverBg, coverInk, position })),
    )
    .onConflictDoNothing();

  /* ---------- katalog dan eksemplar ---------- */
  const bookRows = await db
    .insert(s.books)
    .values(
      BOOKS.map((b, position) => ({
        position,
        slug: b.slug,
        title: b.title,
        author: b.author,
        category: b.category,
        form: b.form,
        coverBg: b.cover.bg,
        coverInk: b.cover.ink,
        motif: b.motif,
        tags: b.tags,
        synopsis: b.synopsis,
        pages: b.pages,
        year: b.year,
        shelf: b.shelf,
        spreads: b.spreads,
      })),
    )
    .returning({ id: s.books.id, slug: s.books.slug });
  const bookId = new Map(bookRows.map((r) => [r.slug, r.id]));

  const copyRows = await db
    .insert(s.bookCopies)
    .values(
      BOOKS.flatMap((b) =>
        Array.from({ length: b.copies.total }, (_, i) => ({ bookId: bookId.get(b.slug)!, code: `${b.shelf}-${i + 1}` })),
      ),
    )
    .returning();
  const copiesOf = (id: string) => copyRows.filter((c) => c.bookId === id).sort((a, b) => a.code.localeCompare(b.code));

  /* ---------- anggota ---------- */
  const shelfBookId = (key: ShelfKey) => {
    const slug = SHELF_TITLES[key].slug;
    return slug ? bookId.get(slug) : undefined;
  };

  const userIdOf = new Map<string, string>();
  const fakes = MEMBERS.filter((m) => m.id !== "me");
  await db.insert(s.user).values(
    fakes.map((m) => ({
      id: `demo-${m.id}`,
      name: m.name!,
      email: `${m.id}@contoh.id`,
      createdAt: new Date(Date.UTC(Number(m.since), 0, 1)),
    })),
  );
  fakes.forEach((m) => userIdOf.set(m.id, `demo-${m.id}`));
  await db.insert(s.profiles).values(
    fakes.map((m) => ({
      userId: `demo-${m.id}`,
      nickname: m.first!,
      gender: MALE.has(m.id) ? ("laki-laki" as const) : ("perempuan" as const),
      avatarLook: m.look!,
      bio: m.bio,
      favCategories: [m.fav],
      readingBookId: shelfBookId(m.reading) ?? null,
    })),
  );

  // Anggota contoh "Rani". Login ada di Neon Auth, jadi di database lokal ia hanya data, tanpa kata sandi.
  const me = MEMBERS.find((m) => m.id === "me")!;
  const meId = crypto.randomUUID();
  const joined = new Date(Date.UTC(2024, 2, 15));
  await db.insert(s.user).values({ id: meId, name: "Rani Kusumawardani", email: DEMO_EMAIL, createdAt: joined });
  await db.insert(s.profiles).values({
    userId: meId,
    nickname: "Rani",
    gender: "perempuan",
    bio: me.bio,
    readingGoal: 12,
    favCategories: ["Fiksi", "Sains"],
    notifications: { due: true, fav: true },
    readingBookId: shelfBookId(me.reading) ?? null,
    createdAt: joined,
  });
  userIdOf.set("me", meId);

  /* ---------- pinjaman: anggota demo ---------- */
  type NewLoan = typeof s.loans.$inferInsert;
  const loanRows: NewLoan[] = [];
  const usedCopy = new Set<string>();
  for (const l of LOANS) {
    const id = bookId.get(l.slug!)!;
    const copy = copiesOf(id).find((c) => l.status === "returned" || !usedCopy.has(c.id))!;
    if (l.status !== "returned") usedCopy.add(copy.id);
    loanRows.push({
      userId: meId,
      copyId: copy.id,
      status: l.status,
      startOn: moved(l.start),
      dueOn: moved(l.due),
      returnedOn: l.status === "returned" ? moved(l.due) : null,
    });
  }

  // Buku yang sedang dipinjam anggota lain, sesuai stok di data contoh.
  const heldByOthers: Array<{ slug: string; member: string; start: number; due: number }> = [
    { slug: "mengukur-laut", member: "arif", start: TODAY - 4 * DAY, due: TODAY + 13 * DAY },
    { slug: "akar-yang-bernyanyi", member: "nadine", start: TODAY - 1 * DAY, due: TODAY + 16 * DAY },
  ];
  for (const h of heldByOthers) {
    const copy = copiesOf(bookId.get(h.slug)!).find((c) => !usedCopy.has(c.id))!;
    usedCopy.add(copy.id);
    loanRows.push({
      userId: userIdOf.get(h.member)!,
      copyId: copy.id,
      status: "active",
      startOn: moved(h.start),
      dueOn: moved(h.due),
    });
  }

  /* ---------- pinjaman: riwayat anggota fiktif, supaya papan baca punya isi ---------- */
  // Tanpa Math.random agar hasilnya sama setiap kali dijalankan.
  const pool = BOOKS.map((b) => bookId.get(b.slug)!);
  fakes.forEach((m, mi) => {
    const buckets: Array<{ count: number; from: number; to: number }> = [
      { count: m.counts.bulan, from: monthStart, to: Math.max(monthStart, todayMs - 3 * DAY) },
      { count: m.counts.tahun - m.counts.bulan, from: yearStart, to: Math.max(yearStart, monthStart - 8 * DAY) },
      { count: m.counts.semua - m.counts.tahun, from: yearStart - 700 * DAY, to: yearStart - 8 * DAY },
    ];
    let k = 0;
    for (const { count, from, to } of buckets) {
      for (let i = 0; i < count; i++, k++) {
        const start = from + Math.floor(((i * 53 + mi * 17 + 7) % 997) / 997 * (to - from));
        const day = Math.floor(start / DAY) * DAY;
        const copies = copiesOf(pool[(k * 5 + mi * 3) % pool.length]);
        loanRows.push({
          userId: userIdOf.get(m.id)!,
          copyId: copies[k % copies.length].id,
          status: "returned",
          startOn: iso(day),
          dueOn: iso(day + 7 * DAY),
          returnedOn: iso(Math.min(day + 7 * DAY, todayMs)),
        });
      }
    }
  });
  for (let i = 0; i < loanRows.length; i += 400) await db.insert(s.loans).values(loanRows.slice(i, i + 400));

  /* ---------- sumbangan terbaru ---------- */
  const guessed: Record<string, string> = {
    "Rumah Lampu di Pesisir": "Fiksi",
    "Catatan Musim Kemarau": "Lainnya",
    "Ensiklopedia Kecil Awan": "Sains",
    "Lagu untuk Kota Tua": "Puisi",
  };
  await db.insert(s.donations).values(
    RECENT_DONATIONS.map((d, i) => {
      const [day, mon] = d.date.split(" ");
      const when = Date.UTC(now.getFullYear(), BULAN_PENDEK.indexOf(mon), Number(day));
      const member = fakes.find((m) => m.first === d.by)!;
      return {
        code: `SB-${iso(when).slice(5, 7)}${iso(when).slice(8)}-${String(i + 1).padStart(4, "0")}`,
        userId: userIdOf.get(member.id)!,
        title: d.title,
        author: "Belum dicatat",
        category: guessed[d.title] ?? "Lainnya",
        condition: "baik" as const,
        method: "antar" as const,
        scheduledOn: iso(when),
        status: "diterima" as const,
        createdAt: new Date(when),
      };
    }),
  );

  const counts = await db.execute(sql`
    select (select count(*) from ${s.books}) as buku, (select count(*) from ${s.bookCopies}) as eksemplar,
           (select count(*) from ${s.user}) as pengguna, (select count(*) from ${s.loans}) as pinjaman, (select count(*) from ${s.donations}) as sumbangan`);
  console.log("Seed selesai:", counts.rows[0]);
  console.log("Login memakai Neon Auth; database lokal tidak menyimpan kata sandi.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
