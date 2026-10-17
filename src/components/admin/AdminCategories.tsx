"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { deleteCategory, moveCategory, saveCategory } from "@/app/admin/kategori/actions";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { iconAction } from "@/components/admin/IconLink";
import { Check, ChevronDown, ChevronUp, Cross, Pencil, Plus, Spinner, Trash } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { readableInk } from "@/lib/color";
import type { AdminCategory } from "@/lib/server/categories";
import { useErrorToast, useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";


/** Warna sampul siap pilih, senada dengan sampul ilustrasi yang sudah ada. */
const SWATCHES = [
  "#4F6F66",
  "#5C7395",
  "#74678F",
  "#9A5B4F",
  "#B07A3E",
  "#3E5A6B",
  "#B9C7B0",
  "#E3BE9C",
  "#C9D3D9",
  "#D9B8C4",
];

const OFFLINE = "Periksa koneksi lalu coba lagi.";

/** Kelola kategori buku: tambah, ganti nama dan warna, atur urutan, dan hapus (dengan memindahkan bukunya). */
export function AdminCategories({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const setNotice = useToast();
  const [editing, setEditing] = useState<AdminCategory | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const formPanel = useRef<HTMLDivElement>(null);

  const openForm = (target: AdminCategory | "new") => {
    setEditing(target);
    setNotice(null);
    requestAnimationFrame(() => {
      formPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formPanel.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
    });
  };

  const move = async (c: AdminCategory, step: -1 | 1) => {
    setBusy(c.name);
    try {
      const result = await moveCategory(c.name, step);
      if (!result.ok) setNotice({ kind: "error", text: result.error });
      else router.refresh();
    } catch {
      setNotice({ kind: "error", text: `Urutan “${c.name}” gagal diubah. ${OFFLINE}` });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (c: AdminCategory, moveTo?: string) => {
    try {
      const result = await deleteCategory(c.name, moveTo);
      if (!result.ok) {
        setNotice({ kind: "error", text: `“${c.name}” tidak dihapus. ${result.error}` });
        return false;
      }
      setNotice({
        kind: "ok",
        text:
          result.moved > 0
            ? `“${c.name}” dihapus. ${result.moved} judul dipindah ke “${moveTo}”.`
            : `“${c.name}” dihapus.`,
      });
      if (editing !== "new" && editing?.name === c.name) setEditing(null);
      router.refresh();
      return true;
    } catch {
      setNotice({ kind: "error", text: `“${c.name}” gagal dihapus. ${OFFLINE}` });
      return false;
    }
  };

  return (
    <div className={cn(ui.wrap, "pt-6")}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display m-0 text-[clamp(44px,5.6vw,68px)] leading-none">Kategori</h1>
          <p className="mt-3 mb-0 max-w-[60ch] text-[15px] leading-relaxed text-ink-3">
            Kategori tampil sebagai filter di katalog, pilihan di formulir buku dan sumbangan, serta kategori favorit
            anggota. Urutan di sini sama dengan urutan di katalog.
          </p>
        </div>
        {editing === null && (
          <button type="button" onClick={() => openForm("new")} className={cn(ui.btn, ui.primary)}>
            <Plus />
            Tambah kategori
          </button>
        )}
      </div>


      {editing !== null && (
        <div ref={formPanel} className="scroll-mt-6">
          <CategoryForm
            key={editing === "new" ? "new" : editing.name}
            category={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={(text) => {
              setEditing(null);
              setNotice({ kind: "ok", text });
              router.refresh();
            }}
          />
        </div>
      )}

      <ol className="m-0 mt-8 flex list-none flex-col overflow-hidden rounded-[22px] border border-line bg-paper p-0">
        {categories.map((c, i) => (
          <CategoryRow
            key={c.name}
            category={c}
            others={categories.filter((o) => o.name !== c.name)}
            first={i === 0}
            last={i === categories.length - 1}
            busy={busy === c.name}
            onMove={(step) => move(c, step)}
            onEdit={() => openForm(c)}
            onDelete={(moveTo) => remove(c, moveTo)}
          />
        ))}
      </ol>
      {categories.length === 0 && (
        <p className="m-0 px-5 py-8 text-center text-[15px] text-ink-3">
          Belum ada kategori. Tekan “Tambah kategori” untuk membuat yang pertama.
        </p>
      )}
    </div>
  );
}

/** Sampul mini berwarna kategori, seperti punggung buku di rak. */
function Spine({ bg, ink, label }: { bg: string; ink: string; label: string }) {
  return (
    <span
      aria-hidden="true"
      className="spine-shade flex h-[60px] w-10 shrink-0 items-end justify-center overflow-hidden rounded-[3px_8px_8px_3px] pb-1.5 text-[11px] font-bold shadow-[0_10px_16px_-12px_rgba(29,43,40,.6)]"
      style={{ backgroundColor: bg, color: ink }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Baris kategori                                                    */
/* ---------------------------------------------------------------- */

function CategoryRow({
  category: c,
  others,
  first,
  last,
  busy,
  onMove,
  onEdit,
  onDelete,
}: {
  category: AdminCategory;
  others: AdminCategory[];
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (step: -1 | 1) => void;
  onEdit: () => void;
  onDelete: (moveTo?: string) => Promise<boolean>;
}) {
  const [moving, setMoving] = useState(false);

  return (
    <li className="border-b border-line-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 pr-3 pl-5 hover:bg-tint">
        <Spine bg={c.cover.bg} ink={c.cover.ink} label={c.name} />
        <div className="min-w-0 flex-1">
          <span className="block font-bold break-words text-ink">{c.name}</span>
          <span className="block text-[13px] text-ink-3">{c.books > 0 ? `${c.books} judul` : "Belum ada buku"}</span>
        </div>
        <div className="flex items-center whitespace-nowrap">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={first || busy}
            aria-label={`Naikkan ${c.name}`}
            title={`Naikkan ${c.name}`}
            className={cn(iconAction, "disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent")}
          >
            <ChevronUp size={22} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={last || busy}
            aria-label={`Turunkan ${c.name}`}
            title={`Turunkan ${c.name}`}
            className={cn(iconAction, "disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent")}
          >
            {busy ? <Spinner size={22} /> : <ChevronDown size={22} />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Ubah ${c.name}`}
            title={`Ubah ${c.name}`}
            className={cn(iconAction, "text-primary-600")}
          >
            <Pencil size={22} />
          </button>
          {others.length === 0 ? null : c.books === 0 ? (
            <ConfirmDelete
              label={`Hapus kategori ${c.name}`}
              title={`Hapus kategori “${c.name}”?`}
              description="Kategori ini belum dipakai buku mana pun. Anggota yang memfavoritkannya tidak lagi melihatnya."
              onConfirm={() => onDelete()}
            />
          ) : (
            <button
              type="button"
              onClick={() => setMoving(true)}
              aria-haspopup="dialog"
              aria-label={`Hapus kategori ${c.name}`}
              title={`Hapus kategori ${c.name}`}
              className={cn(iconAction, "hover:bg-accent-100 hover:text-accent-700")}
            >
              <Trash size={22} />
            </button>
          )}
        </div>
      </div>
      {moving && (
        <MoveAndDelete category={c} others={others} onCancel={() => setMoving(false)} onDelete={onDelete} />
      )}
    </li>
  );
}

/** Kategori yang masih dipakai buku: pilih kategori tujuan di jendela konfirmasi, baru hapus. */
function MoveAndDelete({
  category: c,
  others,
  onCancel,
  onDelete,
}: {
  category: AdminCategory;
  others: AdminCategory[];
  onCancel: () => void;
  onDelete: (moveTo: string) => Promise<boolean>;
}) {
  const id = useId();
  const [target, setTarget] = useState(others.find((o) => o.name === "Lainnya")?.name ?? others[0].name);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    if (!(await onDelete(target))) {
      setBusy(false);
      onCancel();
    }
  };

  return (
    <ConfirmDialog
      title={`Hapus kategori “${c.name}”?`}
      confirmLabel="Pindahkan & hapus"
      busy={busy}
      onConfirm={confirm}
      onCancel={onCancel}
    >
      <p className="m-0">Kategori ini masih dipakai {c.books} judul. Pindahkan dulu ke kategori lain.</p>
      <label htmlFor={`${id}-target`} className={cn(ui.label, "mt-3 mb-2 block")}>
        Pindahkan ke
      </label>
      <select
        id={`${id}-target`}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        disabled={busy}
        className={cn(ui.field, "w-full")}
      >
        {others.map((o) => (
          <option key={o.name} value={o.name}>
            {o.name}
          </option>
        ))}
      </select>
    </ConfirmDialog>
  );
}

/* ---------------------------------------------------------------- */
/* Formulir kategori                                                 */
/* ---------------------------------------------------------------- */

function CategoryForm({
  category,
  onCancel,
  onSaved,
}: {
  category: AdminCategory | null;
  onCancel: () => void;
  onSaved: (text: string) => void;
}) {
  const id = useId();
  const [name, setName] = useState(category?.name ?? "");
  const [bg, setBg] = useState(category?.cover.bg ?? SWATCHES[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setError = useErrorToast();
  const [saving, setSaving] = useState(false);
  const ink = readableInk(bg);
  const custom = !SWATCHES.some((s) => s.toLowerCase() === bg.toLowerCase());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await saveCategory({ original: category?.name, name, coverBg: bg });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        setError(result.error);
        if (result.fields?.name) document.getElementById(`${id}-name`)?.focus();
        return;
      }
      onSaved(
        !category
          ? `“${result.name}” ditambahkan dan sudah bisa dipilih di katalog dan formulir buku.`
          : category.name !== result.name
            ? `“${category.name}” diganti menjadi “${result.name}”.${category.books > 0 ? ` ${category.books} judul ikut berpindah.` : ""}`
            : `“${result.name}” diperbarui.`,
      );
    } catch {
      setError(`Gagal menyimpan. ${OFFLINE}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(ui.card, "mt-6 flex animate-pop flex-col gap-5")}
      aria-labelledby={`${id}-h`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-h`} className="display m-0 text-[26px] leading-none">
          {category ? "Ubah kategori" : "Kategori baru"}
        </h2>
        <button type="button" onClick={onCancel} aria-label="Tutup formulir" className={iconAction}>
          <Cross size={22} />
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className={ui.label}>Nama kategori</span>
            <input
              id={`${id}-name`}
              value={name}
              maxLength={30}
              placeholder="Misalnya Komik atau Agama"
              onChange={(e) => {
                setName(e.target.value);
                setErrors({});
                setError("");
              }}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${id}-name-err` : undefined}
              className={ui.field}
            />
            {errors.name && (
              <span id={`${id}-name-err`} className="text-[13px] font-semibold text-accent-700">
                {errors.name}
              </span>
            )}
            {category && category.books > 0 && (
              <span className="text-[13px] text-ink-3">
                Mengganti nama juga memindahkan {category.books} judul di kategori ini ke nama baru.
              </span>
            )}
          </label>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className={cn(ui.label, "mb-2.5 p-0")}>Warna sampul ilustrasi</legend>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((s) => (
                <label
                  key={s}
                  title={s}
                  className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600"
                >
                  <input
                    type="radio"
                    name={`${id}-color`}
                    value={s}
                    checked={bg.toLowerCase() === s.toLowerCase()}
                    onChange={() => setBg(s)}
                    className="peer sr-only"
                    aria-label={`Warna ${s}`}
                  />
                  <span
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(29,43,40,.15)] peer-checked:shadow-[0_0_0_2.5px_var(--color-paper),0_0_0_4.5px_var(--color-ink)]"
                    style={{ backgroundColor: s, color: readableInk(s) }}
                  >
                    {bg.toLowerCase() === s.toLowerCase() && <Check size={18} />}
                  </span>
                </label>
              ))}
              <label
                className={cn(
                  ui.chip,
                  "relative focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-primary-600",
                  custom && "border-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-4 rounded-full shadow-[inset_0_0_0_1px_rgba(29,43,40,.2)]"
                  style={{ background: custom ? bg : "conic-gradient(#9A5B4F,#B07A3E,#4F6F66,#5C7395,#74678F,#9A5B4F)" }}
                />
                Warna lain
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value.toUpperCase())}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
            <p className="mt-2.5 mb-0 text-[13px] text-ink-3">
              Dipakai untuk buku sumbangan yang belum punya foto sampul. Warna tulisan dipilih otomatis supaya tetap
              terbaca.
            </p>
          </fieldset>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className={ui.label}>Pratinjau</span>
          <div
            aria-hidden="true"
            className="spine-shade flex aspect-[2/3] w-[132px] flex-col justify-between rounded-[3px_10px_10px_3px] p-3.5 pl-5 shadow-[0_22px_30px_-18px_rgba(29,43,40,.55)]"
            style={{ backgroundColor: bg, color: ink }}
          >
            <span className="text-[9px] font-bold tracking-[0.22em] break-words uppercase">
              {name.trim() || "Kategori"}
            </span>
            <span className="display text-[19px] leading-[1.08]">Judul buku</span>
            <span className="text-[10px] font-semibold">Penulis</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className={cn(ui.btn, ui.primary, "disabled:cursor-wait")}
        >
          {saving ? <Spinner /> : <Check />}
          {category ? "Simpan perubahan" : "Tambah kategori"}
        </button>
        <button type="button" onClick={onCancel} className={cn(ui.btn, ui.ghost)}>
          Batal
        </button>
      </div>
    </form>
  );
}
