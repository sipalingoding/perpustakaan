"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { deleteBook, getSourceSynopsis, saveBook, searchPublicBooks } from "@/app/admin/actions";
import { CatalogLink } from "@/components/admin/IconLink";
import { SourceSearch } from "@/components/SourceSearch";
import { CoverMotif } from "@/components/catalog/CoverMotif";
import { ArrowLeft, Check, ImageIcon, Spinner, Trash, Upload } from "@/components/icons";
import { ui } from "@/components/ui";
import type { Category, Motif } from "@/lib/books";
import { cn } from "@/lib/cn";
import { fitImage } from "@/lib/image";
import type { BookFormValues } from "@/lib/server/admin";
import type { SourceBook } from "@/lib/server/book-sources";
import { useErrorToast, useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Values = Omit<BookFormValues, "id" | "slug" | "coverImage" | "minCopies">;
type CoverMode = "keep" | "remote" | "upload" | "none";

const FORMS = [
  "Novel",
  "Kumpulan cerpen",
  "Kumpulan puisi",
  "Buku bergambar",
  "Nonfiksi",
  "Komik",
  "Biografi",
  "Ensiklopedia",
];
const MOTIFS: Array<{ value: Motif; label: string }> = [
  { value: "leaf", label: "Daun" },
  { value: "rain", label: "Hujan" },
  { value: "moon", label: "Bulan" },
  { value: "waves", label: "Ombak" },
  { value: "cup", label: "Cangkir" },
  { value: "ripple", label: "Riak" },
  { value: "lantern", label: "Lampion" },
  { value: "wind", label: "Angin" },
];

/** Formulir tambah dan ubah buku, dengan pencarian data dan sampul di katalog publik. */
export function BookForm({
  initial,
  categories,
  created = false,
}: {
  initial: BookFormValues;
  /** Nama kategori dari /admin/kategori, menurut urutan tampil. */
  categories: Category[];
  created?: boolean;
}) {
  const router = useRouter();
  const formId = useId();
  const isNew = !initial.id;
  const { id: bookId, slug, coverImage: initialImage, minCopies, ...start } = initial;

  // Kategori bawaan atau kategori lama yang sudah dihapus diganti ke kategori pertama yang ada.
  const [values, setValues] = useState<Values>(() =>
    categories.includes(start.category) ? start : { ...start, category: categories[0] ?? "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setNotice = useToast();
  // Buku baru: halaman ini dibuka lewat ?baru=1 setelah tersimpan, jadi kabar suksesnya muncul di sini.
  useEffect(() => {
    if (created) setNotice({ kind: "ok", text: "Buku ditambahkan ke katalog.", action: catalogAction(slug) });
  }, [created, slug, setNotice]);
  const [saving, setSaving] = useState(false);

  // Sampul: gambar tersimpan, gambar dari pencarian, unggahan, atau ilustrasi (warna + motif).
  const [savedImage, setSavedImage] = useState(initialImage);
  const [coverMode, setCoverMode] = useState<CoverMode>(initialImage ? "keep" : "none");
  const [remoteCover, setRemoteCover] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ blob: Blob; url: string } | null>(null);
  // Pesan sampul tampil sebagai notifikasi; selama masih berlaku, tombol "Unggah sampul" ditonjolkan.
  const [coverNote, setCoverNoteState] = useState<string | null>(null);
  const coverToast = useErrorToast();
  const setCoverNote = (text: string | null) => {
    setCoverNoteState(text);
    coverToast(text);
  };
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!upload) return;
    return () => URL.revokeObjectURL(upload.url);
  }, [upload]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  };
  const bind = (key: keyof Values) => ({
    value: values[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
    error: errors[key],
  });

  const coverSrc =
    coverMode === "keep"
      ? savedImage
      : coverMode === "remote"
        ? remoteCover
        : coverMode === "upload"
          ? upload?.url
          : null;

  /* ---------- pencarian ---------- */

  const applySource = (r: SourceBook) => {
    setValues((v) => ({
      ...v,
      title: r.title || v.title,
      author: r.author || v.author,
      year: r.year ? String(r.year) : v.year,
      pages: r.pages ? String(r.pages) : v.pages,
      publisher: r.publisher || v.publisher,
      isbn: r.isbn ?? v.isbn,
      language: r.language ?? v.language,
      synopsis: r.synopsis || v.synopsis,
    }));
    setErrors({});
    setNotice(null);
    if (r.cover) {
      setRemoteCover(r.cover);
      setCoverMode("remote");
      setCoverNote(null);
    } else {
      if (coverMode === "remote") setCoverMode(savedImage ? "keep" : "none");
      setCoverNote(
        "Sampul buku ini belum ada di katalog publik. Unggah foto sampulnya, atau pakai sampul ilustrasi dulu.",
      );
    }
    if (r.workKey && !r.synopsis) {
      getSourceSynopsis(r.workKey).then((text) => {
        if (text) setValues((v) => (v.synopsis ? v : { ...v, synopsis: text }));
      });
    }
  };

  const onRemoteError = () => {
    setCoverMode(savedImage ? "keep" : "none");
    setRemoteCover(null);
    setCoverNote("Sampul dari katalog publik tidak bisa dimuat. Unggah foto sampulnya secara manual.");
  };

  /* ---------- sampul ---------- */

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPreparing(true);
    try {
      const blob = await fitImage(file);
      setUpload({ blob, url: URL.createObjectURL(blob) });
      setCoverMode("upload");
      setCoverNote(null);
    } catch {
      setCoverNote("Gambar ini tidak bisa dibuka. Pakai foto sampul berformat JPG, PNG, atau WebP.");
    } finally {
      setPreparing(false);
    }
  };

  /* ---------- simpan ---------- */

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const form = new FormData();
    if (bookId) form.set("id", bookId);
    for (const [k, v] of Object.entries(values)) form.set(k, v);
    form.set("coverMode", coverMode);
    if (coverMode === "remote" && remoteCover) form.set("coverUrl", remoteCover);
    if (coverMode === "upload" && upload) form.set("coverFile", upload.blob, "sampul.jpg");

    try {
      const result = await saveBook(form);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        setNotice({ kind: "error", text: result.error });
        const first = result.fields && Object.keys(result.fields)[0];
        if (first) document.getElementById(`${formId}-${first}`)?.focus();
        return;
      }
      if (isNew) {
        router.push(`/admin/buku/${result.id}?baru=1`);
        return;
      }
      if (result.coverImage !== undefined) {
        setSavedImage(result.coverImage);
        setCoverMode(result.coverImage ? "keep" : "none");
        setUpload(null);
        setRemoteCover(null);
      }
      setNotice({ kind: "ok", text: "Perubahan tersimpan.", action: catalogAction(slug) });
      router.refresh();
    } catch {
      setNotice({
        kind: "error",
        text: "Gagal menyimpan. Periksa koneksi lalu coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Values) => `${formId}-${key}`;

  return (
    <div className={cn(ui.wrap, "pt-8")}>
      <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-2">
        <ArrowLeft size={18} />
        Kembali ke koleksi
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display m-0 text-[clamp(40px,5vw,60px)] leading-none">
          {isNew ? "Tambah buku" : values.title || "Ubah buku"}
        </h1>
        {slug && <CatalogLink slug={slug} />}
      </div>

      <SourceSearch
        search={searchPublicBooks}
        onPick={applySource}
        className="mt-6"
        heading="Cari data dan sampul di Open Library"
        description="Ketik judul, penulis, atau ISBN. Pilih hasilnya untuk mengisi formulir; kamu tetap bisa mengubah semuanya."
      />

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <Section title="Identitas buku">
            <TextInput id={field("title")} label="Judul" required {...bind("title")} />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
              <TextInput
                id={field("author")}
                label="Penulis"
                required
                {...bind("author")}
                hint="Pisahkan dengan koma bila lebih dari satu."
              />
              <TextInput id={field("publisher")} label="Penerbit" {...bind("publisher")} />
              <TextInput id={field("year")} label="Tahun terbit" inputMode="numeric" {...bind("year")} />
              <TextInput id={field("pages")} label="Jumlah halaman" inputMode="numeric" {...bind("pages")} />
              <TextInput
                id={field("isbn")}
                label="ISBN"
                inputMode="numeric"
                {...bind("isbn")}
                hint="10 atau 13 angka, tanda hubung boleh."
              />
              <TextInput id={field("language")} label="Bahasa" required {...bind("language")} />
            </div>
          </Section>

          <Section title="Di perpustakaan">
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className={cn(ui.label, "mb-2.5 p-0")}>
                Kategori <Req />
              </legend>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <label
                    key={c}
                    className={cn(
                      ui.chip,
                      "focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-primary-600 has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-checked:hover:bg-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name="kategori"
                      value={c}
                      checked={values.category === c}
                      onChange={() => set("category", c)}
                      className="sr-only"
                    />
                    {c}
                  </label>
                ))}
                <Link
                  href="/admin/kategori"
                  className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primary-600 underline-offset-4 hover:underline"
                >
                  Kelola kategori
                </Link>
              </div>
              <FieldError id={field("category")} text={errors.category} />
            </fieldset>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
              <TextInput id={field("form")} label="Bentuk" required list={`${formId}-forms`} {...bind("form")} />
              <datalist id={`${formId}-forms`}>
                {FORMS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
              <TextInput
                id={field("shelf")}
                label="Kode rak"
                required
                autoCapitalize="characters"
                placeholder="F-03"
                {...bind("shelf")}
                onChange={(e) => set("shelf", e.target.value.toUpperCase())}
                hint="Dipakai juga untuk kode eksemplar, misalnya F-03-1."
              />
              <div className="flex flex-col gap-2">
                <span className={ui.label} id={`${field("copies")}-label`}>
                  Jumlah eksemplar <Req />
                </span>
                <div className="flex items-center gap-3" role="group" aria-labelledby={`${field("copies")}-label`}>
                  <button
                    type="button"
                    className={ui.stepper}
                    aria-label="Kurangi eksemplar"
                    disabled={Number(values.copies) <= minCopies}
                    onClick={() => set("copies", String(Math.max(Number(values.copies) - 1, minCopies)))}
                  >
                    −
                  </button>
                  <span
                    id={field("copies")}
                    tabIndex={-1}
                    className="min-w-8 text-center text-lg font-bold"
                    aria-live="polite"
                  >
                    {values.copies}
                  </span>
                  <button
                    type="button"
                    className={ui.stepper}
                    aria-label="Tambah eksemplar"
                    disabled={Number(values.copies) >= 50}
                    onClick={() => set("copies", String(Math.min(Number(values.copies) + 1, 50)))}
                  >
                    +
                  </button>
                </div>
                {minCopies > 1 && (
                  <p className="m-0 text-[13px] text-ink-3">
                    {minCopies} eksemplar pernah dipinjam, jadi tidak bisa dikurangi di bawah itu.
                  </p>
                )}
                <FieldError id={field("copies")} text={errors.copies} />
              </div>
            </div>
            <TextInput
              id={field("tags")}
              label="Kata kunci pencarian"
              {...bind("tags")}
              hint="Kata yang mungkin diketik anggota saat mencari, pisahkan dengan spasi."
            />
          </Section>

          <Section title="Sinopsis">
            <div className="flex flex-col gap-2">
              <label htmlFor={field("synopsis")} className="sr-only">
                Sinopsis
              </label>
              <textarea
                id={field("synopsis")}
                className={cn(ui.field, "min-h-36 resize-y py-3.5 leading-relaxed")}
                maxLength={2000}
                value={values.synopsis}
                onChange={(e) => set("synopsis", e.target.value)}
                aria-describedby={`${field("synopsis")}-count`}
                placeholder="Dua atau tiga kalimat tentang isi buku, tanpa membocorkan akhir cerita."
              />
              <span id={`${field("synopsis")}-count`} className="self-end text-[13px] text-ink-3">
                {values.synopsis.length} / 2000
              </span>
            </div>
          </Section>
        </div>

        <aside className={cn(ui.card, "flex flex-col gap-4 lg:sticky lg:top-28")} aria-labelledby={`${formId}-cover-h`}>
          <h2 id={`${formId}-cover-h`} className="display m-0 text-[28px] leading-none">
            Sampul
          </h2>
          <CoverPreview
            src={coverSrc ?? null}
            onError={coverMode === "remote" ? onRemoteError : undefined}
            values={values}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className={cn(ui.btn, coverNote ? ui.primary : ui.ghost)}
              onClick={() => fileInput.current?.click()}
              disabled={preparing}
              aria-busy={preparing}
            >
              {preparing ? <Spinner /> : <Upload />}
              Unggah sampul
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-label="Pilih berkas gambar sampul"
              onChange={onFile}
            />
            {coverMode !== "none" && (
              <button type="button" className={cn(ui.btn, ui.ghost)} onClick={() => setCoverMode("none")}>
                <ImageIcon />
                Pakai ilustrasi
              </button>
            )}
          </div>
          {coverMode === "none" && savedImage && (
            <button
              type="button"
              className="self-start text-sm font-semibold text-primary-600 underline"
              onClick={() => setCoverMode("keep")}
            >
              Kembali ke sampul tersimpan
            </button>
          )}
          <p className="m-0 text-[13px] text-ink-3">
            {coverMode === "remote" && "Sampul dari katalog publik. Disalin ke Lembar saat buku disimpan."}
            {coverMode === "upload" && "Sampul unggahan. Diperkecil dan disimpan saat buku disimpan."}
            {coverMode === "keep" && "Sampul tersimpan. Warna punggung buku di rak diambil dari sampul ini."}
            {coverMode === "none" &&
              "Sampul ilustrasi dari warna dan motif di bawah, untuk buku yang belum punya foto sampul."}
          </p>
          {coverMode === "none" && <IllustrationOptions values={values} set={set} />}
        </aside>

        <div className="flex flex-wrap items-center gap-3.5 lg:col-span-2">
          <button type="submit" className={cn(ui.btn, ui.primary)} disabled={saving} aria-busy={saving}>
            {saving ? <Spinner /> : <Check />}
            {isNew ? "Tambahkan ke katalog" : "Simpan perubahan"}
          </button>
          <Link href="/admin" className={cn(ui.btn, ui.ghost)}>
            Batal
          </Link>
        </div>
      </form>

      {bookId && <DangerZone id={bookId} title={values.title} />}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function CoverPreview({ src, onError, values }: { src: string | null; onError?: () => void; values: Values }) {
  return (
    <div className="relative mx-auto aspect-[2/3] w-full max-w-[240px] [container-type:inline-size]">
      <div
        className="spine-shade absolute inset-0 flex flex-col gap-[3cqw] overflow-hidden rounded-[3px_10px_10px_3px] pt-[10cqw] pr-[8cqw] pb-[8cqw] pl-[12cqw] shadow-[0_22px_30px_-18px_rgba(29,43,40,.55)]"
        style={{ backgroundColor: values.coverBg, color: values.coverInk }}
      >
        <span className="text-[4.4cqw] font-bold tracking-[0.22em] uppercase">{values.category}</span>
        <span className="display line-clamp-4 text-[9cqw] leading-[1.08]">{values.title || "Judul buku"}</span>
        <span className="flex flex-1 items-center justify-center">
          <CoverMotif motif={values.motif} className="block h-auto w-[74%]" />
        </span>
        <span className="truncate text-[5cqw] font-semibold">{values.author || "Penulis"}</span>
        {src && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal atau dari katalog publik */}
            <img
              key={src}
              src={src}
              alt="Pratinjau sampul"
              onError={onError}
              className="absolute inset-0 size-full object-cover"
            />
            <span className="spine-shade absolute inset-0" />
          </>
        )}
      </div>
    </div>
  );
}

function IllustrationOptions({
  values,
  set,
}: {
  values: Values;
  set: <K extends keyof Values>(k: K, v: Values[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5 border-t border-line-2 pt-4">
      <div className="flex flex-wrap gap-4">
        <ColorInput label="Warna sampul" value={values.coverBg} onChange={(v) => set("coverBg", v)} />
        <ColorInput label="Warna tulisan" value={values.coverInk} onChange={(v) => set("coverInk", v)} />
      </div>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className={cn(ui.label, "mb-2 p-0")}>Motif</legend>
        <div className="flex flex-wrap gap-1.5">
          {MOTIFS.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={values.motif === m.value}
              onClick={() => set("motif", m.value)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-field bg-transparent px-3 text-[13px] font-semibold text-ink-2 hover:bg-tint aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-cream"
            >
              <CoverMotif motif={m.value} className="h-4 w-6" />
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="size-11 cursor-pointer rounded-full border-[1.5px] border-field bg-transparent p-1"
      />
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
    </div>
  );
}

function DangerZone({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const setError = useErrorToast();
  const notify = useToast();

  const remove = async () => {
    setBusy(true);
    setError(null);
    const r = await deleteBook(id).catch(() => ({
      ok: false as const,
      error: "Gagal menghapus. Coba lagi.",
    }));
    if (r.ok) {
      // Tidak dibiarkan sibuk: Next menyimpan halaman ini beserta state-nya.
      setBusy(false);
      setConfirming(false);
      notify({ kind: "ok", text: `“${title}” dihapus dari katalog.` });
      router.push("/admin");
      return;
    }
    setBusy(false);
    setConfirming(false);
    setError(r.error);
  };

  return (
    <section className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
      <div>
        <h2 className="m-0 text-base font-bold">Hapus buku</h2>
        <p className="mt-1 mb-0 max-w-[60ch] text-sm text-ink-3">
          Hanya untuk buku yang belum pernah dipinjam, misalnya salah input. Buku dengan riwayat pinjam tetap tersimpan.
        </p>
      </div>
      <button type="button" className={cn(ui.btn, ui.ghost)} onClick={() => setConfirming(true)} aria-haspopup="dialog">
        <Trash />
        Hapus buku
      </button>
      {confirming && (
        <ConfirmDialog
          title={`Hapus “${title}”?`}
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        >
          Buku ini dihapus dari katalog beserta sampulnya. Tidak bisa dibatalkan.
        </ConfirmDialog>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cn(ui.card, "flex flex-col gap-4")}>
      <h2 className="display m-0 text-[28px] leading-none">{title}</h2>
      {children}
    </section>
  );
}

const Req = () => (
  <span className="text-accent-700" aria-hidden="true">
    *
  </span>
);

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={`${id}-error`} className="m-0 text-[13px] font-semibold text-accent-700">
      {text}
    </p>
  );
}

function TextInput({
  id,
  label,
  hint,
  error,
  required,
  ...input
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & React.ComponentProps<"input">) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={ui.label}>
        {label} {required && <Req />}
      </label>
      <input
        id={id}
        type="text"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(ui.field, error && "border-accent-600")}
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="m-0 text-[13px] text-ink-3">
          {hint}
        </p>
      )}
      <FieldError id={id} text={error} />
    </div>
  );
}

/** Tautan "Lihat di katalog" di notifikasi simpan, bila bukunya sudah punya alamat. */
function catalogAction(slug: string | null | undefined) {
  return slug ? { href: `/buku/${slug}`, label: "Lihat di katalog" } : undefined;
}
