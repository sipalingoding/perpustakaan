import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, profiles } from "@/db/schema";
import type { Tx } from "@/lib/server/collection";
import { LIBRARY_TZ } from "@/lib/server/members";

export type NewNotification = {
  userId: string;
  kind: "peminjaman" | "sumbangan" | "agenda" | "buku";
  title: string;
  body: string;
  href?: string;
};

/** Catat notifikasi. Berikan `tx` agar ikut transaksi perubahan statusnya (tercatat bersama, atau tidak sama sekali). */
export async function notify(items: NewNotification | NewNotification[], tx: Tx | typeof db = db) {
  const list = Array.isArray(items) ? items : [items];
  if (list.length === 0) return;
  await tx.insert(notifications).values(list.map((n) => ({ ...n, href: n.href ?? null })));
}

export type NotificationItem = {
  id: string;
  kind: "peminjaman" | "sumbangan" | "agenda" | "buku";
  title: string;
  body: string;
  href: string | null;
  /** "11 Okt, 10.42" menurut jam perpustakaan. */
  when: string;
  unread: boolean;
};

/** Notifikasi terbaru anggota, yang terbaru di atas. */
export async function getNotifications(userId: string, limit = 12): Promise<NotificationItem[]> {
  const rows = await db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      title: notifications.title,
      body: notifications.body,
      href: notifications.href,
      unread: sql<boolean>`${notifications.readAt} is null`,
      day: sql<number>`extract(day from ${notifications.createdAt} at time zone ${LIBRARY_TZ})::int`,
      month: sql<number>`extract(month from ${notifications.createdAt} at time zone ${LIBRARY_TZ})::int`,
      time: sql<string>`to_char(${notifications.createdAt} at time zone ${LIBRARY_TZ}, 'HH24.MI')`,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return rows.map(({ day, month, time, ...r }) => ({ ...r, when: `${day} ${BULAN[month - 1]}, ${time}` }));
}

export async function countUnread(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row.n;
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/** Hapus semua notifikasi anggota. Pengingat jatuh tempo tidak ikut terhapus karena dihitung dari pinjaman. */
export async function deleteAll(userId: string) {
  const gone = await db
    .delete(notifications)
    .where(eq(notifications.userId, userId))
    .returning({ id: notifications.id });
  return gone.length;
}

/**
 * Kabari anggota yang menyalakan "Buku baru di kategori favorit" dan menandai kategori buku ini sebagai favorit.
 * Panggil di dalam transaksi penambahan buku, supaya notifikasi hanya tercatat bila bukunya tersimpan.
 */
export async function notifyNewBook(
  book: { title: string; author: string; category: string; slug: string },
  tx: Tx | typeof db = db,
) {
  const readers = await tx
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(
      and(
        sql`${book.category} = any(${profiles.favCategories})`,
        sql`coalesce((${profiles.notifications}->>'fav')::boolean, true)`,
      ),
    );
  await notify(
    readers.map((r) => ({
      userId: r.userId,
      kind: "buku" as const,
      title: `Buku baru di ${book.category}`,
      body: `“${book.title}”${book.author.trim() ? ` karya ${book.author.trim()}` : ""} baru masuk rak. Pinjam sebelum keduluan.`,
      href: `/buku/${book.slug}`,
    })),
    tx,
  );
  return readers.length;
}
