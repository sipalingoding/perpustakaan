import type { AvatarLook } from "@/components/Avatar";

export type Gender = "perempuan" | "laki-laki";

/** Data contoh untuk anggota yang sedang masuk, sesuai karakter yang dipilih. */
export const PERSON: Record<Gender, { nama: string; panggil: string; email: string; look: AvatarLook }> = {
  perempuan: {
    nama: "Rani Kusumawardani",
    panggil: "Rani",
    email: "rani@contoh.id",
    look: { type: "hijab", skin: "#C68B62", shirt: "#5C7395", hijab: "#E3BE9C", hijabShade: "#D4A985" },
  },
  "laki-laki": {
    nama: "Raka Pratama",
    panggil: "Raka",
    email: "raka@contoh.id",
    look: { type: "short", skin: "#C68B62", hair: "#2B211B", shirt: "#5C7395", glasses: true },
  },
};

export type AvatarPreset = { id: string; label: string; look: AvatarLook };

/** Pilihan karakter di Profil. Yang pertama untuk tiap jenis kelamin adalah tampilan bawaan akun baru. */
export const AVATAR_PRESETS: Record<Gender, AvatarPreset[]> = {
  perempuan: [
    { id: "p-hijab-krem", label: "Hijab krem", look: PERSON.perempuan.look },
    { id: "p-hijab-sage", label: "Hijab hijau", look: { type: "hijab", skin: "#D9A27C", shirt: "#2E5A52", hijab: "#9DB5A9", hijabShade: "#86A094" } },
    { id: "p-hijab-rose", label: "Hijab mawar", look: { type: "hijab", skin: "#A8704A", shirt: "#74678F", hijab: "#D9A9A0", hijabShade: "#C79189" } },
    { id: "p-bob", label: "Rambut bob", look: { type: "bob", skin: "#D9A27C", hair: "#3A2A22", shirt: "#74678F" } },
    { id: "p-panjang", label: "Rambut panjang", look: { type: "long", skin: "#C68B62", hair: "#4A2F22", shirt: "#D9A77E" } },
    { id: "p-bob-kacamata", label: "Bob berkacamata", look: { type: "bob", skin: "#8E5B3A", hair: "#1F1815", shirt: "#5C7395", glasses: true } },
  ],
  "laki-laki": [
    { id: "l-pendek-kacamata", label: "Pendek berkacamata", look: PERSON["laki-laki"].look },
    { id: "l-pendek", label: "Rambut pendek", look: { type: "short", skin: "#D9A27C", hair: "#3A2A22", shirt: "#2E5A52" } },
    { id: "l-crop", label: "Cepak", look: { type: "crop", skin: "#A8704A", hair: "#1F1815", shirt: "#D9A77E" } },
    { id: "l-crop-kacamata", label: "Cepak berkacamata", look: { type: "crop", skin: "#C68B62", hair: "#4A2F22", shirt: "#74678F", glasses: true } },
    { id: "l-pendek-gelap", label: "Pendek cokelat", look: { type: "short", skin: "#8E5B3A", hair: "#1F1815", shirt: "#5C7395" } },
    { id: "l-pendek-abu", label: "Pendek beruban", look: { type: "short", skin: "#D9A27C", hair: "#8A8780", shirt: "#2E5A52", glasses: true } },
  ],
};


/** Apakah dua tampilan sama (urutan kunci di jsonb tidak dijamin). */
export function sameLook(a: AvatarLook, b: AvatarLook) {
  const keys = ["type", "skin", "shirt", "hair", "hijab", "hijabShade", "glasses"] as const;
  return keys.every((k) => (a[k] ?? false) === (b[k] ?? false));
}
