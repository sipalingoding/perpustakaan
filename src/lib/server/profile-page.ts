import "server-only";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, books, loans, user, type Notifications } from "@/db/schema";
import type { AvatarLook } from "@/components/Avatar";
import type { CoverData } from "@/components/catalog/BookCover";
import type { Category } from "@/lib/books";
import { cardValidUntil, formatMemberNo, monthYear } from "@/lib/member";
import { AVATAR_PRESETS, sameLook, type Gender } from "@/lib/people";
import { expireMissedPickups } from "@/lib/server/loans";
import { fileUrl } from "@/lib/server/storage";
import { getProfile, libraryToday, resolveLook } from "@/lib/server/members";

export type ShelfEntry = {
  id: string;
  title: string;
  author: string;
  slug: string;
  category: string;
  status: "returned" | "active" | "reserved";
  startOn: string;
  dueOn: string;
  returnedOn: string | null;
  cover: CoverData;
};

/** Buku yang sedang dipinjam beserta catatan halaman terakhir yang dibaca. */
export type ReadingEntry = {
  loanId: string;
  title: string;
  author: string;
  slug: string;
  /** Total halaman buku; kosong bila belum tercatat di katalog. */
  pages: number | null;
  currentPage: number;
  cover: CoverData;
  dueOn: string;
};

export type ProfileData = {
  name: string;
  email: string;
  nickname: string;
  phone: string;
  bio: string;
  gender: Gender;
  /** Ilustrasi karakter yang terpilih, tanpa foto. */
  look: AvatarLook;
  /** Id pilihan karakter yang cocok dengan `look`; kosong bila tampilannya khusus. */
  presetId: string | null;
  /** Alamat foto unggahan, bila pernah mengunggah. */
  photo: string | null;
  usePhoto: boolean;
  memberNo: string;
  since: string;
  validUntil: string;
  reading: ReadingEntry[];
  favs: Category[];
  notifs: Notifications;
  year: number;
  shelf: ShelfEntry[];
};

/** Semua yang dibutuhkan halaman Profil untuk satu anggota. */
/** Kolom sampul, supaya buku di profil tampil sama dengan di katalog. */
const coverColumns = {
  title: books.title,
  author: books.author,
  category: books.category,
  motif: books.motif,
  coverBg: books.coverBg,
  coverInk: books.coverInk,
  coverKey: books.coverKey,
};

type CoverRow = {
  title: string;
  author: string;
  category: string;
  motif: CoverData["motif"];
  coverBg: string;
  coverInk: string;
  coverKey: string | null;
};

function withCover<T extends CoverRow>({ motif, coverBg, coverInk, coverKey, ...row }: T) {
  const cover: CoverData = {
    title: row.title,
    author: row.author,
    category: row.category,
    motif,
    bg: coverBg,
    ink: coverInk,
    image: coverKey ? fileUrl(coverKey) : null,
  };
  return { ...row, cover };
}

export async function getProfilePage(userId: string): Promise<ProfileData | undefined> {
  await expireMissedPickups();
  const [profile, [account]] = await Promise.all([
    getProfile(userId),
    db.select({ name: user.name, email: user.email, createdAt: user.createdAt }).from(user).where(eq(user.id, userId)),
  ]);
  if (!profile || !account) return undefined;

  const today = await libraryToday();
  const year = Number(today.slice(0, 4));

  const shelf = await db
    .select({
      id: loans.id,
      slug: books.slug,
      status: loans.status,
      startOn: loans.startOn,
      dueOn: loans.dueOn,
      returnedOn: loans.returnedOn,
      ...coverColumns,
    })
    .from(loans)
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .innerJoin(books, eq(books.id, bookCopies.bookId))
    .where(
      and(
        eq(loans.userId, userId),
        ne(loans.status, "cancelled"),
        sql`${loans.startOn} >= ${`${year}-01-01`}::date`,
      ),
    )
    .orderBy(asc(loans.startOn));

  const reading = await db
    .select({
      loanId: loans.id,
      slug: books.slug,
      pages: books.pages,
      currentPage: sql<number>`coalesce(${loans.currentPage}, 0)`,
      ...coverColumns,
      dueOn: loans.dueOn,
    })
    .from(loans)
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .innerJoin(books, eq(books.id, bookCopies.bookId))
    .where(and(eq(loans.userId, userId), eq(loans.status, "active")))
    .orderBy(asc(loans.dueOn));

  const full = resolveLook(userId, { ...profile, usePhoto: true });
  const { photo: photoSrc, ...resolved } = full;
  const photo = photoSrc && profile.photoKey ? { photo: photoSrc } : null;

  return {
    name: account.name,
    email: account.email,
    nickname: profile.nickname,
    phone: profile.phone ?? "",
    bio: profile.bio,
    gender: profile.gender,
    look: resolved,
    presetId: AVATAR_PRESETS[profile.gender].find((p) => sameLook(p.look, resolved))?.id ?? null,
    photo: photo?.photo ?? null,
    usePhoto: profile.usePhoto && !!photo,
    memberNo: formatMemberNo(account.createdAt, profile.memberNo),
    since: monthYear(account.createdAt),
    validUntil: monthYear(cardValidUntil(account.createdAt)),
    reading: reading.map(withCover),
    favs: profile.favCategories as Category[],
    notifs: profile.notifications,
    year,
    shelf: shelf.map(withCover) as ShelfEntry[],
  };
}

