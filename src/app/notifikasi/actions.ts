"use server";

import { deleteAll, markAllRead } from "@/lib/server/notifications";
import { getViewer } from "@/lib/server/session";

/** Tandai semua notifikasi anggota yang masuk sebagai sudah dibaca (saat daftar notifikasi dibuka). */
export async function markNotificationsRead(): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false };
  await markAllRead(viewer.id);
  return { ok: true };
}

/** Bersihkan daftar notifikasi anggota yang masuk. */
export async function clearNotifications(): Promise<{ ok: true } | { ok: false; error: string }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sesimu sudah berakhir. Masuk lagi, ya." };
  await deleteAll(viewer.id);
  return { ok: true };
}
