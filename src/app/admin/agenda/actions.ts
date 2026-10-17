"use server";

import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/db";
import { agendaEvents, agendaPhotos, agendaRegistrations } from "@/db/schema";
import { AGENDA, AGENDA_KINDS, MAX_AGENDA_PHOTOS } from "@/lib/agenda";
import { formatDay } from "@/lib/dates";
import { isPastSlot, nowTimeJakarta, todayJakarta } from "@/lib/server/agenda";
import { notify } from "@/lib/server/notifications";
import { getRole, getViewer } from "@/lib/server/session";
import { deleteFile, fileUrl, newFileKey, putFile } from "@/lib/server/storage";

type Fail = { ok: false; error: string; fields?: Record<string, string> };

const NOT_ALLOWED: Fail = {
  ok: false,
  error: "Hanya pustakawan yang bisa mengelola agenda. Masuk lagi dengan akun pustakawan.",
};

async function isLibrarian() {
  return !!(await getViewer()) && (await getRole()) === "pustakawan";
}

const hhmm = (t: string) => t.slice(0, 5).replace(":", ".");

/**
 * Jadwal, poster, dan foto tampil di halaman Agenda (dan lonceng notifikasi anggota). Tanpa ini, browser yang pernah
 * membuka /agenda masih menampilkan versi lama, mis. "Jadwal berikutnya belum diumumkan" padahal jadwalnya sudah ada.
 */
function refresh() {
  revalidatePath("/agenda");
  revalidatePath("/admin/agenda");
}

/* ---------------------------------------------------------------- */
/* Jadwal                                                            */
/* ---------------------------------------------------------------- */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const eventInput = z
  .object({
    id: z.uuid().optional(),
    kind: z.enum(AGENDA_KINDS, { error: "Pilih agendanya." }),
    date: z.iso.date({ error: "Pilih tanggal." }),
    startTime: z.string().regex(TIME, "Isi jam mulai."),
    endTime: z.string().regex(TIME, "Isi jam selesai."),
    place: z.string().trim().min(3, "Isi tempatnya.").max(160, "Nama tempat terlalu panjang."),
    capacity: z
      .string()
      .trim()
      .regex(/^\d*$/, "Kuota berupa angka.")
      .transform((v) => (v === "" ? null : Number(v)))
      .pipe(z.number().int().min(1, "Kuota minimal 1.").max(500, "Kuota paling banyak 500.").nullable()),
    note: z.string().trim().max(280, "Catatan paling panjang 280 huruf."),
  })
  .refine((v) => v.endTime > v.startTime, { path: ["endTime"], message: "Jam selesai harus setelah jam mulai." });

export type EventInput = z.input<typeof eventInput>;
export type SaveEventResult = { ok: true; id: string; notified: number } | Fail;

/**
 * Tambah atau ubah jadwal. Peserta yang sudah terdaftar diberi notifikasi bila tanggal, jam, atau tempatnya berubah.
 * Kuota tidak boleh lebih kecil dari jumlah peserta yang sudah terdaftar.
 */
export async function saveEvent(input: EventInput): Promise<SaveEventResult> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  const parsed = eventInput.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Ada isian yang belum benar.", fields };
  }
  const v = parsed.data;

  if (!v.id) {
    if (await isPastSlot(v.date, v.startTime)) {
      return {
        ok: false,
        error: "Waktu mulainya sudah lewat.",
        fields: { date: "Pilih tanggal dan jam yang belum lewat." },
      };
    }
    const [created] = await db
      .insert(agendaEvents)
      .values({
        kind: v.kind,
        date: v.date,
        startTime: v.startTime,
        endTime: v.endTime,
        place: v.place,
        capacity: v.capacity,
        note: v.note,
      })
      .returning({ id: agendaEvents.id });
    refresh();
    return { ok: true, id: created.id, notified: 0 };
  }

  const id = v.id;
  const result = await db.transaction(async (tx): Promise<SaveEventResult> => {
    const [before] = await tx.select().from(agendaEvents).where(eq(agendaEvents.id, id)).for("update");
    if (!before) return { ok: false, error: "Jadwal ini sudah dihapus. Muat ulang halaman." };

    const moved = before.date !== v.date || before.startTime.slice(0, 5) !== v.startTime || before.place !== v.place;
    if (moved && (await isPastSlot(v.date, v.startTime))) {
      return {
        ok: false,
        error: "Waktu mulainya sudah lewat.",
        fields: { date: "Pilih tanggal dan jam yang belum lewat." },
      };
    }
    const people = await tx
      .select({ userId: agendaRegistrations.userId })
      .from(agendaRegistrations)
      .where(eq(agendaRegistrations.eventId, id))
      .orderBy(asc(agendaRegistrations.createdAt));
    if (v.capacity !== null && v.capacity < people.length) {
      return {
        ok: false,
        error: `Sudah ada ${people.length} peserta terdaftar.`,
        fields: { capacity: `Kuota minimal ${people.length}, sesuai peserta yang sudah terdaftar.` },
      };
    }

    await tx
      .update(agendaEvents)
      .set({
        kind: v.kind,
        date: v.date,
        startTime: v.startTime,
        endTime: v.endTime,
        place: v.place,
        capacity: v.capacity,
        note: v.note,
      })
      .where(eq(agendaEvents.id, id));

    const changed = moved || before.kind !== v.kind;
    if (changed && people.length > 0) {
      await notify(
        people.map((p) => ({
          userId: p.userId,
          kind: "agenda" as const,
          title: "Jadwal agenda berubah",
          body: `${AGENDA[v.kind].name} sekarang ${formatDay(Date.parse(v.date))}, ${hhmm(v.startTime)} di ${v.place}. Kamu tetap terdaftar.`,
          href: `/agenda#jadwal-${id}`,
        })),
        tx,
      );
    }
    return { ok: true, id, notified: changed ? people.length : 0 };
  });
  if (result.ok) refresh();
  return result;
}

export type DeleteEventResult = { ok: true; notified: number } | Fail;

/** Hapus jadwal (dibatalkan). Peserta yang terdaftar diberi kabar lewat notifikasi. */
export async function deleteEvent(id: string): Promise<DeleteEventResult> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Jadwal tidak dikenal." };

  const result = await db.transaction(async (tx): Promise<DeleteEventResult & { posterKey?: string | null }> => {
    const [event] = await tx
      .select({
        kind: agendaEvents.kind,
        posterKey: agendaEvents.posterKey,
        date: agendaEvents.date,
        startTime: agendaEvents.startTime,
        upcoming: sql<boolean>`(${agendaEvents.date} > ${todayJakarta} or (${agendaEvents.date} = ${todayJakarta} and ${agendaEvents.endTime} > ${nowTimeJakarta}))`,
      })
      .from(agendaEvents)
      .where(eq(agendaEvents.id, id))
      .for("update");
    if (!event) return { ok: true, notified: 0 };

    const people = await tx
      .select({ userId: agendaRegistrations.userId })
      .from(agendaRegistrations)
      .where(eq(agendaRegistrations.eventId, id));
    // Jadwal yang sudah lewat dihapus tanpa kabar: tidak ada yang perlu dibatalkan.
    if (event.upcoming && people.length > 0) {
      await notify(
        people.map((p) => ({
          userId: p.userId,
          kind: "agenda" as const,
          title: "Agenda dibatalkan",
          body: `${AGENDA[event.kind].name} pada ${formatDay(Date.parse(event.date))}, ${hhmm(event.startTime)} batal diadakan. Maaf, ya. Pantau jadwal berikutnya di halaman Agenda.`,
          href: "/agenda",
        })),
        tx,
      );
    }
    await tx.delete(agendaEvents).where(eq(agendaEvents.id, id));
    return { ok: true, notified: event.upcoming ? people.length : 0, posterKey: event.posterKey };
  });
  if (!result.ok) return result;
  // Berkas poster dihapus setelah datanya terhapus, supaya tidak ada jadwal yang menunjuk berkas hilang.
  await deleteFile(result.posterKey);
  refresh();
  return { ok: true, notified: result.notified };
}

/* ---------------------------------------------------------------- */
/* Poster jadwal                                                     */
/* ---------------------------------------------------------------- */

export type PosterResult = { ok: true; poster: { src: string; width: number; height: number } | null } | Fail;

/**
 * Pasang, ganti, atau hapus poster satu jadwal. FormData: `id`, lalu `poster` (berkas gambar) atau `hapus=1`.
 * Poster lama dihapus dari penyimpanan setelah yang baru tersimpan.
 */
export async function setEventPoster(form: FormData): Promise<PosterResult> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { ok: false, error: "Jadwal tidak dikenal." };
  const [event] = await db
    .select({ posterKey: agendaEvents.posterKey })
    .from(agendaEvents)
    .where(eq(agendaEvents.id, id.data));
  if (!event) return { ok: false, error: "Jadwal ini sudah dihapus. Muat ulang halaman." };

  if (form.get("hapus") === "1") {
    await db
      .update(agendaEvents)
      .set({ posterKey: null, posterWidth: null, posterHeight: null })
      .where(eq(agendaEvents.id, id.data));
    await deleteFile(event.posterKey);
    refresh();
    return { ok: true, poster: null };
  }

  const file = form.get("poster");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih gambar posternya dulu." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Posternya terlalu besar. Coba gambar lain." };

  // Diolah ulang di server seperti foto dokumentasi: JPEG sisi terpanjang maks. 1600 px, tanpa metadata.
  let out: { data: Buffer; info: { width: number; height: number } };
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, error: "Gambar ini tidak bisa dibuka. Pakai poster JPG, PNG, atau WebP." };
  }
  if (out.info.width < 200 || out.info.height < 200) {
    return { ok: false, error: "Posternya terlalu kecil. Minimal 200 piksel." };
  }

  const key = newFileKey("agenda", "poster");
  await putFile(key, out.data);
  try {
    await db
      .update(agendaEvents)
      .set({ posterKey: key, posterWidth: out.info.width, posterHeight: out.info.height })
      .where(eq(agendaEvents.id, id.data));
  } catch (e) {
    await deleteFile(key);
    throw e;
  }
  await deleteFile(event.posterKey);
  refresh();
  return { ok: true, poster: { src: fileUrl(key), width: out.info.width, height: out.info.height } };
}

/* ---------------------------------------------------------------- */
/* Foto dokumentasi                                                  */
/* ---------------------------------------------------------------- */

const MAX_UPLOAD_BYTES = 950 * 1024;

export type PhotoUploadResult =
  { ok: true; photo: { id: string; src: string; width: number; height: number; caption: string } } | Fail;

export async function uploadAgendaPhoto(form: FormData): Promise<PhotoUploadResult> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  const kind = z.enum(AGENDA_KINDS).safeParse(form.get("kind"));
  if (!kind.success) return { ok: false, error: "Agenda tidak dikenal." };
  const caption = z
    .string()
    .trim()
    .max(140)
    .safeParse(form.get("caption") ?? "");
  if (!caption.success) return { ok: false, error: "Keterangan foto paling panjang 140 huruf." };
  const file = form.get("foto");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih fotonya dulu." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Fotonya terlalu besar. Coba foto lain." };

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(agendaPhotos)
    .where(eq(agendaPhotos.kind, kind.data));
  if (n >= MAX_AGENDA_PHOTOS) {
    return {
      ok: false,
      error: `${AGENDA[kind.data].name} sudah punya ${MAX_AGENDA_PHOTOS} foto. Hapus salah satu dulu.`,
    };
  }

  // Diolah ulang di server: JPEG sisi terpanjang maks. 1600 px, tanpa metadata (termasuk lokasi).
  let out: { data: Buffer; info: { width: number; height: number } };
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, error: "Gambar ini tidak bisa dibuka. Pakai foto JPG, PNG, atau WebP." };
  }
  if (out.info.width < 200 || out.info.height < 200)
    return { ok: false, error: "Fotonya terlalu kecil. Minimal 200 piksel." };

  const key = newFileKey("agenda", kind.data);
  await putFile(key, out.data);
  try {
    const [row] = await db
      .insert(agendaPhotos)
      .values({ kind: kind.data, fileKey: key, width: out.info.width, height: out.info.height, caption: caption.data })
      .returning({ id: agendaPhotos.id });
    refresh();
    return {
      ok: true,
      photo: { id: row.id, src: fileUrl(key), width: out.info.width, height: out.info.height, caption: caption.data },
    };
  } catch (e) {
    await deleteFile(key);
    throw e;
  }
}

export async function deleteAgendaPhoto(id: string): Promise<{ ok: true } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Foto tidak dikenal." };
  const [gone] = await db.delete(agendaPhotos).where(eq(agendaPhotos.id, id)).returning({ key: agendaPhotos.fileKey });
  await deleteFile(gone?.key);
  refresh();
  return { ok: true };
}
