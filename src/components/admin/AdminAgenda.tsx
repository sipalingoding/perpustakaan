"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  deleteAgendaPhoto,
  deleteEvent,
  saveEvent,
  setEventPoster,
  uploadAgendaPhoto,
  type EventInput,
} from "@/app/admin/agenda/actions";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { iconAction } from "@/components/admin/IconLink";
import { Check, Cross, ImageIcon, Pencil, Plus, Spinner, Trash, Upload } from "@/components/icons";
import { ui } from "@/components/ui";
import { AGENDA, AGENDA_KINDS, MAX_AGENDA_PHOTOS, type AgendaKind } from "@/lib/agenda";
import { cn } from "@/lib/cn";
import { formatDay, formatShort } from "@/lib/dates";
import { fitImage } from "@/lib/image";
import type { AdminAgendaEvent, AgendaPhoto } from "@/lib/server/agenda";
import { useErrorToast, useToast } from "@/components/Toast";


const MAX_UPLOAD_BYTES = 950 * 1024;
const NOTE_MAX = 280;

const emptyForm = (): EventInput => ({
  kind: "tanpa-gadget",
  date: "",
  startTime: "19:00",
  endTime: "21:00",
  place: "Perpustakaan Lembar",
  capacity: "",
  note: "",
});

const day = (iso: string) => formatShort(Date.parse(iso));

/** Kelola agenda kopi darat: jadwal (beserta peserta) dan foto dokumentasi per agenda. */
export function AdminAgenda({
  upcoming,
  past,
  photos,
  today,
}: {
  upcoming: AdminAgendaEvent[];
  past: AdminAgendaEvent[];
  photos: Record<AgendaKind, AgendaPhoto[]>;
  /** "YYYY-MM-DD" menurut waktu Jakarta, batas bawah pilihan tanggal. */
  today: string;
}) {
  const router = useRouter();
  const setNotice = useToast();
  const [editing, setEditing] = useState<AdminAgendaEvent | "new" | null>(null);
  const formPanel = useRef<HTMLDivElement>(null);

  const openForm = (target: AdminAgendaEvent | "new") => {
    setEditing(target);
    setNotice(null);
    requestAnimationFrame(() => {
      formPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formPanel.current?.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
    });
  };

  const remove = async (e: AdminAgendaEvent) => {
    const label = `${AGENDA[e.kind].name} ${day(e.date)}`;
    try {
      const result = await deleteEvent(e.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: `${label} tidak dihapus. ${result.error}` });
        return false;
      }
      setNotice({
        kind: "ok",
        text:
          result.notified > 0
            ? `${label} dihapus. ${result.notified} peserta diberi kabar pembatalan lewat notifikasi.`
            : `${label} dihapus.`,
      });
      if (editing !== "new" && editing?.id === e.id) setEditing(null);
      router.refresh();
      return true;
    } catch {
      setNotice({ kind: "error", text: `${label} gagal dihapus. Periksa koneksi lalu coba lagi.` });
      return false;
    }
  };

  return (
    <div className={cn(ui.wrap, "pt-6")}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display m-0 text-[clamp(44px,5.6vw,68px)] leading-none">Agenda</h1>
          <p className="mt-3 mb-0 max-w-[60ch] text-[15px] leading-relaxed text-ink-3">
            Jadwal kopi darat bersama @kopiku_literasi. Jadwal yang belum selesai tampil di halaman Agenda, dan anggota
            bisa mendaftar sampai acaranya dimulai.
          </p>
        </div>
        {editing === null && (
          <button type="button" onClick={() => openForm("new")} className={cn(ui.btn, ui.primary)}>
            <Plus />
            Tambah jadwal
          </button>
        )}
      </div>


      {editing !== null && (
        <div ref={formPanel} className="scroll-mt-6">
          <EventForm
            key={editing === "new" ? "new" : editing.id}
            event={editing === "new" ? null : editing}
            today={today}
            onCancel={() => setEditing(null)}
            onSaved={(text) => {
              setEditing(null);
              setNotice({ kind: "ok", text });
              router.refresh();
            }}
          />
        </div>
      )}

      <section aria-labelledby="jadwal-h" className="mt-8">
        <h2 id="jadwal-h" className="display m-0 text-[30px] leading-none">
          Jadwal yang akan datang
        </h2>
        <EventTable
          events={upcoming}
          onEdit={openForm}
          onDelete={remove}
          empty="Belum ada jadwal. Tekan “Tambah jadwal” untuk mengumumkan agenda berikutnya."
        />
        {past.length > 0 && (
          <details className="group mt-6">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-ink-2">
              Jadwal yang sudah lewat ({past.length} terakhir)
            </summary>
            <EventTable events={past} onDelete={remove} empty="" />
          </details>
        )}
      </section>

      <section aria-labelledby="foto-h" className="mt-14">
        <h2 id="foto-h" className="display m-0 text-[30px] leading-none">
          Dokumentasi kegiatan
        </h2>
        <p className="mt-2 mb-0 max-w-[62ch] text-[15px] leading-relaxed text-ink-3">
          Foto tampil di penjelasan tiap agenda, terbaru lebih dulu. Paling banyak {MAX_AGENDA_PHOTOS} foto per agenda.
          Pastikan orang yang tampil di foto setuju fotonya dipajang.
        </p>
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,520px),1fr))] gap-5">
          {AGENDA_KINDS.map((k) => (
            <PhotoManager key={k} kind={k} photos={photos[k]} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Tabel jadwal                                                      */
/* ---------------------------------------------------------------- */

function EventTable({
  events,
  onEdit,
  onDelete,
  empty,
}: {
  events: AdminAgendaEvent[];
  onEdit?: (e: AdminAgendaEvent) => void;
  onDelete: (e: AdminAgendaEvent) => Promise<boolean>;
  empty: string;
}) {
  return (
    <div className="relative mt-4 overflow-x-auto rounded-[22px] border border-line bg-paper">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <caption className="sr-only">Daftar jadwal agenda, {events.length} baris</caption>
        <thead>
          <tr className="border-b border-line text-[13px] text-ink-3">
            <th scope="col" className="py-3 pr-3 pl-5 font-semibold">
              Agenda
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Waktu
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Tempat
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Peserta
            </th>
            <th scope="col" className="py-3 pr-5 pl-3 text-right font-semibold">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const info = AGENDA[e.kind];
            const label = `${info.name} ${day(e.date)}`;
            return (
              <tr key={e.id} className="border-b border-line-2 align-top last:border-b-0 hover:bg-tint">
                <td className="py-3.5 pr-3 pl-5">
                  <span className="flex items-center gap-2 font-bold text-ink">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: info.tone.bg }}
                    />
                    {info.name}
                  </span>
                  {e.note && <span className="mt-1 block max-w-[34ch] text-[13px] text-ink-3">{e.note}</span>}
                  {e.poster && (
                    <a
                      href={e.poster.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-[13px] font-semibold text-primary-600"
                    >
                      <ImageIcon size={16} />
                      Lihat poster
                    </a>
                  )}
                </td>
                <td className="px-3 py-3.5">
                  <span className="block font-semibold text-ink-2">{formatDay(Date.parse(e.date))}</span>
                  <span className="block text-[13px] text-ink-3">
                    {e.start}–{e.end} WIB
                  </span>
                  {e.started && onEdit && (
                    <span className="status mt-1.5 bg-secondary-100 text-secondary-600">Sedang berlangsung</span>
                  )}
                </td>
                <td className="max-w-[24ch] px-3 py-3.5 text-ink-2">{e.place}</td>
                <td className="px-3 py-3.5">
                  <span className="block font-semibold text-ink-2 tabular-nums">
                    {e.registered}
                    {e.capacity !== null ? ` / ${e.capacity}` : ""} orang
                  </span>
                  {e.capacity === null && <span className="block text-xs text-muted">Tanpa batas kursi</span>}
                  {e.participants.length > 0 && <ParticipantsButton event={e} title={label} />}
                </td>
                <td className="py-2 pr-5 pl-3 text-right whitespace-nowrap">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(e)}
                      aria-label={`Ubah ${label}`}
                      title={`Ubah ${label}`}
                      className={cn(iconAction, "text-primary-600")}
                    >
                      <Pencil size={22} />
                    </button>
                  )}
                  <ConfirmDelete
                    label={`Hapus ${label}`}
                    title={`Hapus ${label}?`}
                    description={
                      onEdit && e.registered > 0
                        ? `Agenda ini batal. ${e.registered} peserta yang sudah mendaftar diberi kabar lewat notifikasi.`
                        : "Jadwal ini hilang dari halaman Agenda dan tidak bisa dikembalikan."
                    }
                    onConfirm={() => onDelete(e)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {events.length === 0 && empty && <p className="m-0 px-5 py-8 text-center text-[15px] text-ink-3">{empty}</p>}
    </div>
  );
}

/** Tombol "Lihat peserta" yang membuka daftar peserta di jendela di tengah layar. */
function ParticipantsButton({ event: e, title }: { event: AdminAgendaEvent; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="mt-1 inline-flex min-h-8 cursor-pointer items-center border-0 bg-transparent p-0 text-[13px] font-semibold text-primary-600 hover:underline"
      >
        Lihat peserta
      </button>
      {open && <ParticipantsDialog event={e} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

function ParticipantsDialog({
  event: e,
  title,
  onClose,
}: {
  event: AdminAgendaEvent;
  title: string;
  onClose: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-h`}
      onCancel={(ev) => {
        ev.preventDefault();
        onClose();
      }}
      // Klik di area gelap (di luar kotak) menutup jendela.
      onClick={(ev) => ev.target === ev.currentTarget && onClose()}
      className="m-auto max-h-[min(640px,calc(100dvh-32px))] w-[min(480px,calc(100vw-32px))] max-w-none animate-pop overflow-hidden rounded-[26px] border border-line bg-paper p-0 text-left text-ink shadow-[0_40px_80px_-30px_rgba(29,43,40,.6)] backdrop:bg-[rgb(18_26_24/0.55)]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line-2 py-4 pr-3 pl-6">
          <div className="min-w-0 pt-1">
            <h2 id={`${id}-h`} className="m-0 text-lg leading-snug font-bold">
              Peserta {title}
            </h2>
            <p className="m-0 mt-0.5 text-[13px] text-ink-3 tabular-nums">
              {e.registered}
              {e.capacity !== null ? ` dari ${e.capacity} kursi` : " orang, tanpa batas kursi"} · {e.start}–{e.end} WIB
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup daftar peserta" autoFocus className={iconAction}>
            <Cross size={22} />
          </button>
        </div>
        <ol className="m-0 flex list-none flex-col overflow-y-auto p-2">
          {e.participants.map((p, i) => (
            <li key={p.email} className="flex items-start gap-3 rounded-[14px] px-4 py-2.5 hover:bg-tint">
              <span className="w-6 shrink-0 pt-px text-right text-[13px] font-semibold text-muted tabular-nums">
                {i + 1}.
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{p.name}</span>
                <a href={`mailto:${p.email}`} className="block text-[13px] break-all text-ink-3">
                  {p.email}
                </a>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  );
}

/* ---------------------------------------------------------------- */
/* Formulir jadwal                                                   */
/* ---------------------------------------------------------------- */

function EventForm({
  event,
  today,
  onCancel,
  onSaved,
}: {
  event: AdminAgendaEvent | null;
  today: string;
  onCancel: () => void;
  onSaved: (text: string) => void;
}) {
  const id = useId();
  const [values, setValues] = useState<EventInput>(() =>
    event
      ? {
          kind: event.kind,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          place: event.place,
          capacity: event.capacity === null ? "" : String(event.capacity),
          note: event.note,
        }
      : emptyForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setError = useErrorToast();
  const [saving, setSaving] = useState(false);
  // Poster: gambar baru yang sudah diperkecil di browser, atau tanda hapus untuk poster yang tersimpan.
  const [posterDraft, setPosterDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const [removePoster, setRemovePoster] = useState(false);
  const [preparingPoster, setPreparingPoster] = useState(false);
  const posterInput = useRef<HTMLInputElement>(null);
  const posterSrc = posterDraft?.url ?? (removePoster ? null : (event?.poster?.src ?? null));

  const choosePoster = async (file: File | undefined) => {
    if (!file) return;
    setPreparingPoster(true);
    try {
      let blob = await fitImage(file, 1600, 1600, 0.85);
      if (blob.size > MAX_UPLOAD_BYTES) blob = await fitImage(file, 1400, 1400, 0.72);
      if (blob.size > MAX_UPLOAD_BYTES) {
        setError("Poster ini masih terlalu besar setelah diperkecil. Coba gambar lain.");
        return;
      }
      if (posterDraft) URL.revokeObjectURL(posterDraft.url);
      setPosterDraft({ blob, url: URL.createObjectURL(blob) });
      setRemovePoster(false);
    } catch {
      setError("Gambar ini tidak bisa dibuka. Pakai poster JPG, PNG, atau WebP.");
    } finally {
      setPreparingPoster(false);
    }
  };

  const dropPoster = () => {
    if (posterDraft) URL.revokeObjectURL(posterDraft.url);
    setPosterDraft(null);
    setRemovePoster(!!event?.poster);
  };

  /** Simpan perubahan poster setelah jadwalnya tersimpan. Mengembalikan pesan galat, atau null bila beres. */
  const savePoster = async (eventId: string): Promise<string | null> => {
    if (!posterDraft && !removePoster) return null;
    const form = new FormData();
    form.set("id", eventId);
    if (posterDraft) form.set("poster", posterDraft.blob, "poster.jpg");
    else form.set("hapus", "1");
    try {
      const r = await setEventPoster(form);
      return r.ok ? null : r.error;
    } catch {
      return "Periksa koneksi lalu coba lagi.";
    }
  };

  const set = (patch: Partial<EventInput>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
    setError("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await saveEvent({ ...values, id: event?.id });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        setError(result.error);
        const first = result.fields && Object.keys(result.fields)[0];
        if (first) document.getElementById(`${id}-${first}`)?.focus();
        return;
      }
      const posterError = await savePoster(result.id);
      const name = AGENDA[values.kind as AgendaKind].name;
      const when = formatDay(Date.parse(values.date));
      if (posterError) setError(`Jadwal tersimpan, tapi posternya belum: ${posterError} Buka "Ubah" untuk mencoba lagi.`);
      onSaved(
        event
          ? result.notified > 0
            ? `${name} ${when} diperbarui. ${result.notified} peserta diberi kabar perubahan jadwal.`
            : `${name} ${when} diperbarui.`
          : `${name} ${when} ditambahkan dan sudah tampil di halaman Agenda.`,
      );
    } catch {
      setError("Gagal menyimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] && (
      <span id={`${id}-${key}-err`} className="text-[13px] font-semibold text-accent-700">
        {errors[key]}
      </span>
    );
  const described = (key: string) => (errors[key] ? `${id}-${key}-err` : undefined);

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(ui.card, "mt-6 flex animate-pop flex-col gap-5")}
      aria-labelledby={`${id}-h`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-h`} className="display m-0 text-[26px] leading-none">
          {event ? "Ubah jadwal" : "Jadwal baru"}
        </h2>
        <button type="button" onClick={onCancel} aria-label="Tutup formulir" className={iconAction}>
          <Cross size={22} />
        </button>
      </div>
      {event && event.registered > 0 && (
        <p className="m-0 text-sm text-ink-3">
          {event.registered} anggota sudah terdaftar. Bila tanggal, jam, tempat, atau agendanya diubah, mereka mendapat
          notifikasi.
        </p>
      )}

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className={cn(ui.label, "mb-2.5 p-0")}>Agenda</legend>
        <div className="flex flex-wrap gap-2">
          {AGENDA_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={values.kind === k}
              onClick={() => set({ kind: k })}
              className={ui.chip}
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ backgroundColor: AGENDA[k].tone.bg }}
              />
              {AGENDA[k].name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        <label className="flex flex-col gap-2">
          <span className={ui.label}>Tanggal</span>
          <input
            id={`${id}-date`}
            type="date"
            min={today}
            value={values.date}
            onChange={(e) => set({ date: e.target.value })}
            aria-invalid={!!errors.date}
            aria-describedby={described("date")}
            className={ui.field}
          />
          {fieldError("date")}
        </label>
        <label className="flex flex-col gap-2">
          <span className={ui.label}>Mulai (WIB)</span>
          <input
            id={`${id}-startTime`}
            type="time"
            value={values.startTime}
            onChange={(e) => set({ startTime: e.target.value })}
            aria-invalid={!!errors.startTime}
            aria-describedby={described("startTime")}
            className={ui.field}
          />
          {fieldError("startTime")}
        </label>
        <label className="flex flex-col gap-2">
          <span className={ui.label}>Selesai (WIB)</span>
          <input
            id={`${id}-endTime`}
            type="time"
            value={values.endTime}
            onChange={(e) => set({ endTime: e.target.value })}
            aria-invalid={!!errors.endTime}
            aria-describedby={described("endTime")}
            className={ui.field}
          />
          {fieldError("endTime")}
        </label>
        <label className="flex flex-col gap-2">
          <span className={ui.label}>Kuota kursi</span>
          <input
            id={`${id}-capacity`}
            inputMode="numeric"
            placeholder="Kosong = tanpa batas"
            value={values.capacity}
            onChange={(e) => set({ capacity: e.target.value })}
            aria-invalid={!!errors.capacity}
            aria-describedby={described("capacity")}
            className={ui.field}
          />
          {fieldError("capacity")}
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={ui.label}>Tempat</span>
        <input
          id={`${id}-place`}
          value={values.place}
          onChange={(e) => set({ place: e.target.value })}
          aria-invalid={!!errors.place}
          aria-describedby={described("place")}
          className={ui.field}
        />
        {fieldError("place")}
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <span className={ui.label}>Catatan untuk peserta (tema, pemantik, yang perlu dibawa)</span>
          <span className="text-xs text-muted tabular-nums">
            {values.note.length}/{NOTE_MAX}
          </span>
        </span>
        <textarea
          id={`${id}-note`}
          rows={3}
          maxLength={NOTE_MAX}
          value={values.note}
          onChange={(e) => set({ note: e.target.value })}
          aria-invalid={!!errors.note}
          aria-describedby={described("note")}
          className={cn(ui.field, "py-3 leading-relaxed")}
        />
        {fieldError("note")}
      </label>

      <div className="flex flex-col gap-2.5">
        <span id={`${id}-poster-h`} className={ui.label}>
          Poster (opsional)
        </span>
        <div className="flex flex-wrap items-start gap-4">
          {posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal atau berkas unggahan sendiri
            <img
              src={posterSrc}
              alt="Pratinjau poster"
              className="max-h-56 w-auto max-w-[180px] rounded-[14px] border border-line bg-white object-contain"
            />
          ) : (
            <span className="flex h-40 w-[128px] flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-field px-3 text-center text-xs font-semibold text-muted">
              <ImageIcon size={28} />
              Belum ada poster
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
            <p className="m-0 max-w-[48ch] text-[13px] leading-relaxed text-ink-3">
              Tampil di halaman Agenda. JPG, PNG, atau WebP; diperkecil otomatis sampai 1600 piksel.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => posterInput.current?.click()}
                disabled={preparingPoster || saving}
                aria-busy={preparingPoster}
                aria-describedby={`${id}-poster-h`}
                className={cn(ui.btn, ui.ghost, "min-h-11 px-4 text-sm")}
              >
                {preparingPoster ? <Spinner size={18} /> : <Upload size={18} />}
                {posterSrc ? "Ganti poster" : "Pilih poster"}
              </button>
              {posterSrc && (
                <button
                  type="button"
                  onClick={dropPoster}
                  disabled={saving}
                  className={cn(ui.btn, ui.ghost, "min-h-11 px-4 text-sm hover:bg-accent-100 hover:text-accent-700")}
                >
                  <Trash size={18} />
                  Hapus poster
                </button>
              )}
            </div>
            {(posterDraft || removePoster) && (
              <p className="m-0 text-[13px] font-semibold text-ink-2">
                {posterDraft ? "Poster baru tersimpan" : "Poster dihapus"} setelah kamu menekan tombol simpan.
              </p>
            )}
          </div>
          <input
            ref={posterInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Pilih berkas poster"
            onChange={(e) => {
              choosePoster(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
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
          {event ? "Simpan perubahan" : "Umumkan jadwal"}
        </button>
        <button type="button" onClick={onCancel} className={cn(ui.btn, ui.ghost)}>
          Batal
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- */
/* Foto dokumentasi per agenda                                       */
/* ---------------------------------------------------------------- */

function PhotoManager({ kind, photos }: { kind: AgendaKind; photos: AgendaPhoto[] }) {
  const router = useRouter();
  const id = useId();
  const info = AGENDA[kind];
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const setNotice = useToast();
  const [refreshing, startRefresh] = useTransition();
  const full = photos.length >= MAX_AGENDA_PHOTOS;

  const discard = () => {
    if (draft) URL.revokeObjectURL(draft.url);
    setDraft(null);
    setCaption("");
  };

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setNotice(null);
    try {
      let blob = await fitImage(file, 1600, 1600, 0.85);
      if (blob.size > MAX_UPLOAD_BYTES) blob = await fitImage(file, 1400, 1400, 0.72);
      if (blob.size > MAX_UPLOAD_BYTES) {
        setNotice({ kind: "error", text: "Foto ini masih terlalu besar setelah diperkecil. Coba foto lain." });
        return;
      }
      discard();
      setDraft({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setNotice({ kind: "error", text: "Gambar ini tidak bisa dibuka. Pakai foto JPG, PNG, atau WebP." });
    }
  };

  const upload = async () => {
    if (!draft) return;
    setBusy(true);
    setNotice(null);
    const form = new FormData();
    form.set("kind", kind);
    form.set("caption", caption);
    form.set("foto", draft.blob, "foto.jpg");
    try {
      const result = await uploadAgendaPhoto(form);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      discard();
      setNotice({ kind: "ok", text: "Foto ditambahkan ke halaman Agenda." });
      startRefresh(() => router.refresh());
    } catch {
      setNotice({ kind: "error", text: "Gagal mengunggah. Periksa koneksi lalu coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: AgendaPhoto, i: number) => {
    try {
      const result = await deleteAgendaPhoto(p.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return false;
      }
      setNotice({ kind: "ok", text: `Foto ${i + 1} dihapus.` });
      startRefresh(() => router.refresh());
      return true;
    } catch {
      setNotice({ kind: "error", text: "Foto gagal dihapus. Periksa koneksi lalu coba lagi." });
      return false;
    }
  };

  return (
    <section aria-labelledby={`${id}-h`} className={cn(ui.card, "flex flex-col gap-4")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${id}-h`} className="m-0 flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: info.tone.bg }} />
          {info.name}
        </h3>
        <span className="text-[13px] text-ink-3 tabular-nums">
          {photos.length} / {MAX_AGENDA_PHOTOS} foto
          {refreshing && <Spinner size={14} className="ml-1.5 inline align-[-2px]" />}
        </span>
      </div>

      {photos.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5 p-0">
          {photos.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto dari rute berkas sendiri */}
              <img
                src={p.src}
                alt={p.caption || `Foto ${i + 1}`}
                loading="lazy"
                className="aspect-square w-full rounded-[12px] object-cover"
              />
              <div className="flex min-h-11 items-center justify-between gap-1">
                <span className="line-clamp-2 min-w-0 text-xs text-ink-3">{p.caption || "Tanpa keterangan"}</span>
                <ConfirmDelete
                  label={`Hapus foto ${i + 1} ${info.name}`}
                  title={`Hapus foto ${i + 1}?`}
                  description="Foto ini hilang dari halaman Agenda dan tidak bisa dikembalikan."
                  onConfirm={() => remove(p, i)}
                  className="shrink-0"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !draft && (
          <p className="m-0 flex items-center gap-2 text-sm text-ink-3">
            <ImageIcon size={20} className="shrink-0" />
            Belum ada foto. Halaman Agenda menampilkan ilustrasi sampai foto pertama diunggah.
          </p>
        )
      )}

      {draft ? (
        <div className="flex flex-wrap items-end gap-3 rounded-[18px] bg-tint-2 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal */}
          <img
            src={draft.url}
            alt="Pratinjau foto yang akan diunggah"
            className="h-24 w-32 rounded-[10px] object-cover"
          />
          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <span className={ui.label}>Keterangan (boleh kosong)</span>
            <input
              value={caption}
              maxLength={140}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Mis. Sesi membaca 12 Oktober"
              className="min-h-11 w-full rounded-[12px] border-[1.5px] border-field bg-white px-3 text-sm text-ink focus:border-primary-600 focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={upload}
              disabled={busy}
              aria-busy={busy}
              className={cn(ui.btn, ui.primary, "min-h-11 px-4 text-sm disabled:cursor-wait")}
            >
              {busy ? <Spinner size={18} /> : <Upload size={18} />}
              Unggah
            </button>
            <button
              type="button"
              onClick={discard}
              disabled={busy}
              className={cn(ui.btn, ui.ghost, "min-h-11 px-4 text-sm")}
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void choose(file);
            }}
          />
          <button
            type="button"
            disabled={full}
            onClick={() => fileInput.current?.click()}
            className={cn(ui.btn, ui.ghost, "min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50")}
          >
            <Plus size={18} />
            {full ? `Sudah ${MAX_AGENDA_PHOTOS} foto` : "Tambah foto"}
          </button>
        </div>
      )}

    </section>
  );
}
