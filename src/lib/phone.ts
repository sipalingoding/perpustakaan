/**
 * Nomor HP Indonesia. Disimpan dalam bentuk baku "08…" (hanya angka), apa pun cara anggota mengetiknya:
 * "0812 3456 7890", "+62 812-3456-7890", dan "6281234567890" semuanya jadi "081234567890".
 */

/** Pesan bila nomor tidak bisa dibaca, dipakai di formulir dan server supaya sama persis. */
export const PHONE_HINT = "Isi nomor HP yang diawali 08 atau +62, 10 sampai 13 angka.";

/** Bentuk baku nomor HP, atau null bila bukan nomor HP Indonesia yang masuk akal. */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!/^\+?[0-9\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  return /^08\d{8,11}$/.test(digits) ? digits : null;
}

/** "081234567890" -> "0812-3456-7890". Nomor lama yang tidak baku ditampilkan apa adanya. */
export function formatPhone(phone: string) {
  const p = normalizePhone(phone);
  if (!p) return phone;
  return [p.slice(0, 4), p.slice(4, 8), p.slice(8)].filter(Boolean).join("-");
}

/** Tautan chat WhatsApp untuk nomor ini, atau null bila nomornya tidak baku. */
export function whatsappUrl(phone: string) {
  const p = normalizePhone(phone);
  return p ? `https://wa.me/62${p.slice(1)}` : null;
}
