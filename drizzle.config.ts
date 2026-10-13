import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Tanpa .env.local, DATABASE_URL harus sudah ada di lingkungan (mis. di server produksi).
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrasi lewat koneksi langsung (tanpa pooler) bila tersedia, sesuai anjuran Neon untuk DDL.
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)! },
});
