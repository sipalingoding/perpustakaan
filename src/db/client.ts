import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import * as schema from "./schema";

// Node 20 belum punya WebSocket bawaan yang stabil; driver Neon membutuhkannya untuk koneksi Pool.
neonConfig.webSocketConstructor = ws;

const isNeon = (url: string) => {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
};

/**
 * Dipakai bersama oleh aplikasi (lewat db/index.ts) dan skrip di folder scripts/.
 * Database Neon memakai driver Neon JS (Pool lewat WebSocket, mendukung transaksi);
 * Postgres lokal tetap memakai node-postgres, karena driver Neon hanya bisa bicara dengan Neon.
 */
export function createDb(connectionString: string) {
  if (isNeon(connectionString)) {
    const pool = new NeonPool({ connectionString, max: 10 });
    // Kedua driver mengembalikan hasil berbentuk sama (`rows`), jadi tipe node-postgres dipakai untuk keduanya.
    const db = drizzleNeon(pool, { schema, casing: "snake_case" }) as unknown as NodePgDatabase<typeof schema>;
    return { pool, db };
  }
  const pool = new PgPool({ connectionString, max: 10 });
  return { pool, db: drizzlePg(pool, { schema, casing: "snake_case" }) };
}

export type Db = ReturnType<typeof createDb>["db"];
export { schema };
