"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type ChangeEvent, type ComponentProps } from "react";
import { removePhoto, saveAccount, saveGender, saveLook, savePhoto, savePreferences, selectPhoto } from "@/app/profil/actions";
import { Avatar } from "@/components/Avatar";
import { ArrowRight, Camera, Check, Pencil, Spinner, Trash } from "@/components/icons";
import { LeaningBook } from "@/components/illustrations/LeaningBook";
import { ReaderArmchair } from "@/components/illustrations/ReaderArmchair";
import { ShelfPlant } from "@/components/illustrations/ShelfPlant";
import { MemberCard } from "@/components/profile/MemberCard";
import { ReadingTracker } from "@/components/profile/ReadingTracker";
import { ui } from "@/components/ui";
import { CATEGORIES, type Category } from "@/lib/books";
import { cn } from "@/lib/cn";
import { formatDay, formatShort } from "@/lib/dates";
import { squarePhoto } from "@/lib/image";
import { AVATAR_PRESETS, PERSON, type Gender } from "@/lib/people";
import type { ProfileData, ShelfEntry } from "@/lib/server/profile-page";

type Notice = { kind: "ok" } | { kind: "error"; text: string } | null;

const KIND: Record<ShelfEntry["status"], { status: string; className: string; cta: string }> = {
  returned: { status: "Sudah dikembalikan", className: "bg-primary-100 text-primary-700", cta: "Lihat di katalog" },
  active: { status: "Sedang dipinjam", className: "bg-secondary-100 text-secondary-600", cta: "Lihat jadwal" },
  reserved: { status: "Terbooking", className: "bg-accent-100 text-accent-700", cta: "Lihat buku" },
};

const NOTIFS = [
  { key: "due", title: "Pengingat jatuh tempo", desc: "Dua hari sebelum buku perlu dikembalikan." },
  { key: "fav", title: "Buku baru di kategori favorit", desc: "Kabar saat ada judul baru di rak yang kamu sukai." },
  { key: "recap", title: "Ringkasan bacaan bulanan", desc: "Catatan singkat buku yang kamu pinjam setiap bulan." },
] as const;

const SPINE_HEIGHTS = [240, 262, 230, 218, 236];

function shelfNote(s: ShelfEntry, year: number) {
  const start = Date.parse(s.startOn);
  if (s.status === "returned") {
    return `Dipinjam ${formatShort(start)}, dikembalikan ${formatShort(Date.parse(s.returnedOn ?? s.dueOn))} ${year}.`;
  }
  if (s.status === "active") {
    return `Sedang bersamamu sejak ${formatShort(start)}. Kembalikan sebelum ${formatDay(Date.parse(s.dueOn))}.`;
  }
  return `Terbooking, ambil di meja sirkulasi pada ${formatDay(start)}.`;
}

export function ProfileClient({ data }: { data: ProfileData }) {
  const [, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ nama: data.name, panggil: data.nickname, telp: data.phone, bio: data.bio });
  const [gender, setGenderState] = useState<Gender>(data.gender);
  const [favs, setFavs] = useState<Record<Category, boolean>>(
    () => Object.fromEntries(CATEGORIES.map((c) => [c, data.favs.includes(c)])) as Record<Category, boolean>,
  );
  const [notifs, setNotifs] = useState(data.notifs);

  const shelf = data.shelf.map((s, i) => ({
    ...s,
    note: shelfNote(s, data.year),
    href: s.status === "active" ? "/jadwal" : `/buku/${s.slug}`,
    height: SPINE_HEIGHTS[i % SPINE_HEIGHTS.length],
  }));
  const [selected, setSelected] = useState(Math.min(2, Math.max(shelf.length - 1, 0)));
  const readCount = shelf.filter((s) => s.status !== "reserved").length;
  const activeCount = shelf.filter((s) => s.status === "active").length;
  const reservedCount = shelf.filter((s) => s.status === "reserved").length;
  const [presetId, setPresetId] = useState(data.presetId);
  const [photo, setPhoto] = useState(data.photo);
  const [usePhoto, setUsePhoto] = useState(data.usePhoto);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const preset = AVATAR_PRESETS[gender].find((p) => p.id === presetId);
  const baseLook = preset?.look ?? (gender === data.gender ? data.look : PERSON[gender].look);
  const look = usePhoto && photo ? { ...baseLook, photo } : baseLook;
  const pick = shelf[selected];

  const setField = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setNotice(null);
  };

  /** Simpan perubahan ke server; kalau gagal, kembalikan tampilan ke nilai sebelumnya. */
  const persist = (save: () => Promise<{ ok: true } | { ok: false; error: string }>, revert?: () => void) =>
    startTransition(async () => {
      const result = await save();
      if (result.ok) return setNotice({ kind: "ok" });
      revert?.();
      setNotice({ kind: "error", text: result.error });
    });

  const onSave = () => {
    setSaving(true);
    persist(async () => {
      try {
        return await saveAccount({ name: form.nama, nickname: form.panggil, phone: form.telp, bio: form.bio });
      } finally {
        setSaving(false);
      }
    });
  };

  const pickGender = (next: Gender) => {
    if (next === gender) return;
    const before = { gender, presetId };
    setGenderState(next);
    setPresetId(AVATAR_PRESETS[next][0].id);
    persist(() => saveGender(next), () => {
      setGenderState(before.gender);
      setPresetId(before.presetId);
    });
  };

  const pickLook = (id: string) => {
    if (id === presetId && !usePhoto) return;
    const before = { presetId, usePhoto };
    setPresetId(id);
    setUsePhoto(false);
    persist(() => saveLook(id), () => {
      setPresetId(before.presetId);
      setUsePhoto(before.usePhoto);
    });
  };

  const pickPhoto = () => {
    if (usePhoto) return;
    setUsePhoto(true);
    persist(() => selectPhoto(), () => setUsePhoto(false));
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setPhotoNote(null);
    try {
      const form = new FormData();
      form.append("foto", await squarePhoto(file), "foto.jpg");
      const result = await savePhoto(form);
      if (result.ok) {
        setPhoto(result.photo);
        setUsePhoto(true);
      } else {
        setPhotoNote(result.error);
      }
    } catch {
      setPhotoNote("Gambar ini tidak bisa dibuka. Coba foto lain berformat JPG, PNG, atau WebP.");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = () => {
    const before = { photo, usePhoto };
    setPhoto(null);
    setUsePhoto(false);
    setPhotoNote(null);
    setRemoving(true);
    persist(
      async () => {
        try {
          return await removePhoto();
        } finally {
          setRemoving(false);
        }
      },
      () => {
        setPhoto(before.photo);
        setUsePhoto(before.usePhoto);
      },
    );
  };

  const changePrefs = (nextFavs: Record<Category, boolean>, nextNotifs: typeof notifs) => {
    const before = { favs, notifs };
    setFavs(nextFavs);
    setNotifs(nextNotifs);
    persist(
      () => savePreferences({ favs: CATEGORIES.filter((c) => nextFavs[c]), notifs: nextNotifs }),
      () => {
        setFavs(before.favs);
        setNotifs(before.notifs);
      },
    );
  };

  return (
    <div className={cn(ui.wrap, "pt-8")}>
      {/* Sapaan */}
      <section className="relative grid animate-fade-up grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-center gap-x-10 gap-y-4 overflow-hidden rounded-[36px] bg-primary-100 p-[clamp(28px,4vw,56px)]">
        <div aria-hidden="true" className="absolute -top-40 -right-[120px] size-[480px] rounded-full bg-primary-200" />
        <div className="relative flex flex-col gap-5">
          <span className={ui.eyebrow}>Profil anggota</span>
          <h1 className="display m-0 text-[clamp(52px,6.4vw,88px)] leading-[.98]">
            Halo, <span className="text-primary-500">{form.panggil}</span>.
          </h1>
          <p className="m-0 max-w-[40ch] text-lg leading-relaxed text-ink-3">
            Anggota Lembar sejak {data.since}. Di sini kamu bisa melihat kartu anggota, rak bacaanmu, dan mengatur akun.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <span className={ui.stat}>
              <strong>{activeCount}</strong> sedang dipinjam
            </span>
            <span className={ui.stat}>
              <strong>{reservedCount}</strong> terbooking
            </span>
            <span className={ui.stat}>
              <strong>{readCount}</strong> buku tahun ini
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2.5">
            <a href="#akun" className={cn(ui.btn, ui.primary)}>
              <Pencil />
              Ubah profil
            </a>
            <Link href="/jadwal" className={cn(ui.btn, ui.ghost)}>
              Lihat jadwal
            </Link>
          </div>
        </div>
        <ReaderArmchair gender={gender} name={form.panggil} className="relative block h-auto w-full" />
      </section>

      {/* Kartu & target */}
      <div className="mt-8 flex flex-wrap items-stretch gap-6">
        <section className={cn(ui.card, "flex min-w-0 flex-[1_1_420px] animate-fade-up flex-col gap-[18px] [animation-delay:.1s]")}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="display m-0 text-[30px] leading-none">Kartu anggota</h2>
            <span className="text-[13px] text-ink-3">Ketuk kartu untuk membaliknya</span>
          </div>
          <MemberCard name={data.name} look={look} memberNo={data.memberNo} since={data.since} validUntil={data.validUntil} />
        </section>

        <ReadingTracker entries={data.reading} gender={gender} name={form.panggil} />
      </div>

      {/* Rak bacaan */}
      <section className="mt-16 flex animate-fade-up flex-col gap-5 [animation-delay:.25s]">
        <div className="flex flex-col gap-2">
          <h2 className="display m-0 text-[44px] leading-none">Rak bacaanku</h2>
          <p className="m-0 text-[15px] text-ink-3">
            Buku yang kamu pinjam tahun ini. Tarik salah satu dari rak untuk melihat catatannya.
          </p>
        </div>
        <div className="relative overflow-hidden rounded-[28px] bg-primary-100 px-[clamp(16px,3vw,40px)] pt-9 pb-[30px]">
          <div className="flex min-h-[300px] items-end gap-2 overflow-x-auto px-1.5 pt-10">
            {shelf.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={cn("spine cursor-pointer border-0", s.status === "reserved" && "striped")}
                style={{ height: s.height, backgroundColor: s.coverBg, color: s.coverInk }}
                aria-pressed={i === selected}
                aria-label={`${s.title}, ${KIND[s.status].status.toLowerCase()}`}
                onClick={() => setSelected(i)}
              >
                <span className="spine-title" aria-hidden="true">
                  {s.title}
                </span>
              </button>
            ))}
            <LeaningBook className="ml-2.5 h-[105px] w-[70px] shrink-0 origin-bottom-left rotate-[14deg]" />
            <ShelfPlant className="ml-auto h-28 w-[84px] shrink-0" />
          </div>
          <div className="h-4 rounded bg-wood shadow-[0_6px_0_var(--color-wood-dark),0_24px_30px_-18px_rgba(29,43,40,.5)]" />
        </div>
        {pick ? (
        <div
          key={selected}
          aria-live="polite"
          className={cn(ui.card, "flex animate-pop flex-wrap items-center gap-x-[22px] gap-y-[18px]")}
        >
          <span
            aria-hidden="true"
            className="spine-shade h-[74px] w-[52px] shrink-0 rounded-[3px_8px_8px_3px] shadow-[0_10px_16px_-10px_rgba(29,43,40,.6)]"
            style={{ backgroundColor: pick.coverBg }}
          />
          <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5">
            <span className={cn("status", KIND[pick.status].className)}>{KIND[pick.status].status}</span>
            <h3 className="m-0 text-lg leading-snug font-bold">{pick.title}</h3>
            <p className="m-0 text-sm text-ink-3">
              {pick.author} · {pick.category}
            </p>
            <p className="m-0 text-sm leading-relaxed text-ink-2">{pick.note}</p>
          </div>
          <Link href={pick.href} className={cn(ui.btn, ui.ghost)}>
            {KIND[pick.status].cta}
            <ArrowRight />
          </Link>
        </div>
        ) : (
          <div className={cn(ui.card, "flex flex-wrap items-center justify-between gap-x-6 gap-y-4")}>
            <div className="flex flex-col gap-1.5">
              <h3 className="m-0 text-lg leading-snug font-bold">Rakmu masih kosong.</h3>
              <p className="m-0 max-w-[52ch] text-sm leading-relaxed text-ink-2">
                Buku yang kamu pinjam tahun ini akan berdiri di sini. Pilih satu dari katalog untuk memulai.
              </p>
            </div>
            <Link href="/" className={cn(ui.btn, ui.ghost)}>
              Buka katalog
              <ArrowRight />
            </Link>
          </div>
        )}
      </section>

      {/* Akun & preferensi */}
      <div className="mt-16 flex flex-wrap items-start gap-6">
        <section id="akun" className={cn(ui.card, "flex min-w-0 flex-[999_1_520px] scroll-mt-6 flex-col gap-[18px]")}>
          <h2 className="display m-0 text-[32px] leading-none">Informasi akun</h2>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className={cn(ui.label, "mb-2.5 p-0")}>Jenis kelamin</legend>
            <div className="flex flex-wrap gap-2.5">
              {(["perempuan", "laki-laki"] as const).map((g) => (
                <label
                  key={g}
                  className={cn(
                    ui.chip,
                    "min-h-[52px] gap-2.5 pr-5 pl-[7px] focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-primary-600 has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-checked:hover:border-ink has-checked:hover:bg-ink",
                  )}
                >
                  <input
                    type="radio"
                    name="jenis-kelamin"
                    value={g}
                    checked={g === gender}
                    onChange={() => pickGender(g)}
                    className="sr-only"
                  />
                  <span className="size-[38px] shrink-0 overflow-hidden rounded-full shadow-[0_0_0_2px_var(--color-paper)]">
                    <Avatar look={PERSON[g].look} className="block size-full" />
                  </span>
                  <span>{g === "perempuan" ? "Perempuan" : "Laki-laki"}</span>
                </label>
              ))}
            </div>
            <p className="mt-2.5 mb-0 text-[13px] text-ink-3">
              Menentukan pilihan karakter di bawah. Ilustrasinya tampil di profil, kartu anggota, avatar, dan papan baca.
            </p>
          </fieldset>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className={cn(ui.label, "mb-2.5 p-0")}>Foto profil</legend>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <span className="size-24 shrink-0 overflow-hidden rounded-full shadow-[0_0_0_3px_var(--color-paper),0_0_0_4px_var(--color-line)]">
                <Avatar look={look} className="block size-full" />
              </span>
              <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5">
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    className={cn(ui.btn, ui.ghost)}
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    aria-busy={uploading}
                  >
                    {uploading ? <Spinner /> : <Camera />}
                    {photo ? "Ganti foto" : "Unggah foto"}
                  </button>
                  {photo && (
                    <button type="button" className={cn(ui.btn, ui.ghost)} onClick={deletePhoto} disabled={removing} aria-busy={removing}>
                      {removing ? <Spinner /> : <Trash />}
                      Hapus foto
                    </button>
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Pilih berkas foto profil"
                    onChange={onFile}
                  />
                </div>
                <p className="m-0 text-[13px] text-ink-3">JPG, PNG, atau WebP. Fotomu dipotong jadi persegi dan hanya terlihat oleh anggota yang masuk.</p>
                <p role="status" aria-live="polite" className="m-0 min-h-0 text-sm font-semibold text-accent-700 empty:hidden">
                  {photoNote}
                </p>
              </div>
            </div>
            <div role="group" aria-label="Pilih karakter" className="mt-4 flex flex-wrap items-center gap-2.5">
              <span className="basis-full text-[13px] text-ink-3">Atau pilih karakter</span>
              {photo && (
                <LookTile label="Fotoku" selected={usePhoto} onClick={pickPhoto}>
                  <Avatar look={{ ...baseLook, photo }} className="block size-full" />
                </LookTile>
              )}
              {AVATAR_PRESETS[gender].map((p) => (
                <LookTile key={p.id} label={p.label} selected={!usePhoto && p.id === presetId} onClick={() => pickLook(p.id)}>
                  <Avatar look={p.look} className="block size-full" />
                </LookTile>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
            <TextField id="p-nama" label="Nama lengkap" autoComplete="name" value={form.nama} onChange={setField("nama")} />
            <TextField
              id="p-panggil"
              label="Nama panggilan"
              autoComplete="nickname"
              value={form.panggil}
              onChange={setField("panggil")}
            />
            <div className="flex flex-col gap-2">
              <label className={ui.label} htmlFor="p-email">
                Email
              </label>
              <input id="p-email" type="email" className={cn(ui.field, "bg-tint-2 text-ink-3")} value={data.email} readOnly />
              <p className="m-0 text-[13px] text-ink-3">Dipakai untuk masuk, belum bisa diubah.</p>
            </div>
            <TextField
              id="p-telp"
              label="Nomor telepon"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="Opsional"
              value={form.telp}
              onChange={setField("telp")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={ui.label} htmlFor="p-bio">
              Tentang aku sebagai pembaca
            </label>
            <textarea
              id="p-bio"
              className={cn(ui.field, "min-h-24 resize-y py-3.5 leading-normal")}
              value={form.bio}
              maxLength={280}
              placeholder="Ceritakan buku atau suasana membaca yang kamu suka."
              onChange={setField("bio")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            <button type="button" className={cn(ui.btn, ui.primary)} onClick={onSave} disabled={saving} aria-busy={saving}>
              Simpan perubahan
              {saving && <Spinner />}
            </button>
            <span role="status" aria-live="polite">
              {notice?.kind === "ok" && (
                <span className="inline-flex animate-pop items-center gap-2 text-sm font-semibold text-primary-600">
                  <Check />
                  Perubahan tersimpan
                </span>
              )}
              {notice?.kind === "error" && <span className="text-sm font-semibold text-accent-700">{notice.text}</span>}
            </span>
          </div>
        </section>

        <section className={cn(ui.card, "flex min-w-0 flex-[1_1_360px] flex-col gap-[18px]")}>
          <h2 className="display m-0 text-[32px] leading-none">Preferensi</h2>
          <div className="flex flex-col gap-2.5">
            <span className={ui.label}>Kategori favorit</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={ui.chip}
                  aria-pressed={favs[c]}
                  onClick={() => changePrefs({ ...favs, [c]: !favs[c] }, notifs)}
                >
                  {favs[c] && <Check size={16} />}
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <span className={cn(ui.label, "pb-1.5")}>Notifikasi</span>
            {NOTIFS.map((n) => (
              <label
                key={n.key}
                className="flex min-h-14 cursor-pointer items-center justify-between gap-4 border-t border-line-2 py-2.5"
              >
                <span>
                  <strong className="block text-[15px]">{n.title}</strong>
                  <span className="mt-0.5 block text-[13px] text-ink-3">{n.desc}</span>
                </span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={notifs[n.key]}
                  onChange={() => changePrefs(favs, { ...notifs, [n.key]: !notifs[n.key] })}
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function LookTile({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "size-14 shrink-0 cursor-pointer overflow-hidden rounded-full border-0 p-0 outline-offset-[3px] transition-shadow",
        selected
          ? "shadow-[0_0_0_2px_var(--color-paper),0_0_0_4px_var(--color-ink)]"
          : "shadow-[0_0_0_2px_var(--color-paper),0_0_0_3px_var(--color-line)] hover:shadow-[0_0_0_2px_var(--color-paper),0_0_0_3px_var(--color-primary-400)]",
      )}
    >
      {children}
    </button>
  );
}

function TextField({
  id,
  label,
  ...input
}: { id: string; label: string } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-2">
      <label className={ui.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} type="text" className={ui.field} {...input} />
    </div>
  );
}
