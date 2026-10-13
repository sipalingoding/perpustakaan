"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bookCondition, category, donationMethod, donations } from "@/db/schema";
import { isAllowedCoverUrl, normalizeIsbn, searchForForm, type SearchResponse } from "@/lib/server/book-sources";
import { isOpenSlot } from "@/lib/server/donations";
import { notify } from "@/lib/server/notifications";
import { getViewer } from "@/lib/server/session";

export type DonationResult = { ok: true; code: string } | { ok: false; error: string };

const donation = z
  .object({
    title: z.string().trim().min(1).max(120),
    author: z.string().trim().min(1).max(80),
    category: z.enum(category.enumValues),
    condition: z.enum(bookCondition.enumValues),
    qty: z.number().int().min(1).max(20),
    note: z.string().trim().max(120),
    method: z.enum(donationMethod.enumValues),
    address: z.string().trim().max(240),
    scheduledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduledHour: z.number().int(),
    /** Data dari katalog publik bila buku dipilih lewat pencarian. Semua opsional; yang tidak sah dibuang. */
    source: z
      .object({
        isbn: z.string().nullable().catch(null),
        publisher: z.string().trim().max(120).catch(""),
        year: z.number().int().min(1000).max(2100).nullable().catch(null),
        pages: z.number().int().min(1).max(10000).nullable().catch(null),
        language: z.string().trim().max(40).nullable().catch(null),
        coverUrl: z.string().max(500).nullable().catch(null),
        sourceRef: z.string().max(80).nullable().catch(null),
      })
      .nullable()
      .optional()
      .catch(null),
    showName: z.boolean(),
  })
  .refine((d) => d.method !== "jemput" || d.address.length > 0, { path: ["address"] });

export async function createDonation(input: z.input<typeof donation>): Promise<DonationResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sesimu sudah berakhir. Masuk lagi, ya." };

  const parsed = donation.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Isiannya belum lengkap. Periksa judul, penulis, dan alamat." };
  const d = parsed.data;

  // Tanggal dan jam hanya boleh salah satu dari pilihan yang ditawarkan, dihitung ulang di server (jam Jakarta).
  if (!(await isOpenSlot(d.scheduledOn, d.scheduledHour))) {
    return { ok: false, error: "Tanggal atau jam itu sudah tidak tersedia. Pilih jadwal lain." };
  }

  const [row] = await db
    .insert(donations)
    .values({
      // SB-MMDD-NNNN: MMDD dari tanggal sumbangan, NNNN dari sequence agar tidak pernah kembar.
      code: sql`'SB-' || to_char(${d.scheduledOn}::date, 'MMDD') || '-' || lpad(nextval('donation_code_seq')::text, 4, '0')`,
      userId: viewer.id,
      title: d.title,
      author: d.author,
      category: d.category,
      condition: d.condition,
      qty: d.qty,
      note: d.note,
      method: d.method,
      address: d.method === "jemput" ? d.address : null,
      scheduledOn: d.scheduledOn,
      scheduledHour: d.scheduledHour,
      isbn: (d.source?.isbn && normalizeIsbn(d.source.isbn)) || null,
      publisher: d.source?.publisher || null,
      year: d.source?.year ?? null,
      pages: d.source?.pages ?? null,
      language: d.source?.language || null,
      coverUrl: d.source?.coverUrl && isAllowedCoverUrl(d.source.coverUrl) ? d.source.coverUrl : null,
      sourceRef: d.source?.sourceRef && /^\/works\/OL\d+W$/.test(d.source.sourceRef) ? d.source.sourceRef : null,
      showName: d.showName,
    })
    .returning({ code: donations.code });

  await notify({
    userId: viewer.id,
    kind: "sumbangan",
    title: "Sumbangan diajukan",
    body: `Sumbangan “${d.title}” (${row.code}) menunggu persetujuan pustakawan.`,
    href: "/sumbang",
  });
  revalidatePath("/sumbang");
  return { ok: true, code: row.code };
}

/** Cari data buku di katalog publik untuk mengisi formulir sumbangan. Khusus anggota yang masuk. */
export async function searchDonationBooks(query: string): Promise<SearchResponse> {
  if (!(await getViewer())) return { ok: false, error: "Sesimu sudah berakhir. Masuk lagi, ya." };
  return searchForForm(query);
}
