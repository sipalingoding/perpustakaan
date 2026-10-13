import "server-only";
import { createDb, type Db } from "./client";

type Connection = ReturnType<typeof createDb> & { url: string };

// Satu koneksi bersama per proses. Di mode dev, modul dimuat ulang saat file berubah,
// jadi disimpan di globalThis supaya tidak menumpuk koneksi.
const globalForDb = globalThis as unknown as { lembarDb?: Connection };

/**
 * Koneksi untuk DATABASE_URL saat ini. Bila alamatnya berubah (mis. .env.local diganti ke database lain
 * selagi `next dev` berjalan), koneksi lama ditutup dan dibuat yang baru, supaya server tidak diam-diam
 * tetap memakai database sebelumnya.
 */
function current(): Connection {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi. Salin .env.example ke .env.local lalu isi.");
  const existing = globalForDb.lembarDb;
  if (existing?.url === url) return existing;
  if (existing) {
    console.warn("[db] DATABASE_URL berubah, koneksi database dibuat ulang.");
    existing.pool.end().catch(() => {});
  }
  return (globalForDb.lembarDb = { ...createDb(url), url });
}

/** Klien Drizzle. Setiap akses memakai koneksi untuk DATABASE_URL yang berlaku saat itu. */
export const db = new Proxy({} as Db, {
  get(_, prop) {
    const target = current().db;
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
