"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { saveReadingProgress } from "@/app/profil/actions";
import { BookCover } from "@/components/catalog/BookCover";
import { ArrowRight, Check, Spinner } from "@/components/icons";
import { LadderReader } from "@/components/illustrations/LadderReader";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/dates";
import type { Gender } from "@/lib/people";
import type { ReadingEntry } from "@/lib/server/profile-page";
import { useToast } from "@/components/Toast";

/** Tracker bacaan: buku yang sedang dipinjam, halaman terakhir yang dibaca dari total halamannya. */
export function ReadingTracker({ entries, gender, name }: { entries: ReadingEntry[]; gender: Gender; name: string }) {
  return (
    <section className={cn(ui.card, "flex min-w-0 flex-[1_1_420px] animate-fade-up flex-col gap-4 [animation-delay:.2s]")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display m-0 text-[30px] leading-none">Sedang dibaca</h2>
        {entries.length > 0 && <span className="text-[13px] text-ink-3">{entries.length} buku dipinjam</span>}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <LadderReader gender={gender} name={name} className="block h-auto w-full max-w-[260px]" />
          <p className="m-0 max-w-[36ch] text-sm leading-relaxed text-ink-2">
            Belum ada buku yang sedang kamu pinjam. Setelah bukunya kamu ambil, catat halaman terakhir yang kamu baca di sini.
          </p>
          <Link href="/" className={cn(ui.btn, ui.ghost)}>
            Cari buku di katalog
            <ArrowRight />
          </Link>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {entries.map((e) => (
            <li key={e.loanId} className="border-t border-line-2 py-4 first:border-t-0 first:pt-0 last:pb-0">
              <TrackerRow entry={e} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TrackerRow({ entry }: { entry: ReadingEntry }) {
  const [saved, setSaved] = useState(entry.currentPage);
  const [value, setValue] = useState(String(entry.currentPage || ""));
  const [busy, setBusy] = useState(false);
  const notify = useToast();
  // Judul buku jadi judul notifikasi, karena beberapa buku bisa dicatat di halaman yang sama.
  const setMessage = (m: { kind: "ok" | "error"; text: string } | null) => notify(m && { ...m, title: entry.title });
  const total = entry.pages;
  const pct = total ? Math.min(100, Math.round((saved / total) * 100)) : null;
  const done = total !== null && saved >= total;
  const inputId = `hal-${entry.loanId}`;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const page = Number(value);
    if (value.trim() === "" || !Number.isInteger(page) || page < 0) {
      setMessage({ kind: "error", text: "Isi nomor halaman dengan angka." });
      return;
    }
    if (total !== null && page > total) {
      setMessage({ kind: "error", text: `Buku ini hanya ${total} halaman.` });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await saveReadingProgress(entry.loanId, page);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setSaved(result.page);
      setMessage({ kind: "ok", text: total !== null && result.page >= total ? "Selesai dibaca. Tercatat." : "Tersimpan." });
    } catch {
      setMessage({ kind: "error", text: "Gagal menyimpan. Periksa koneksi lalu coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex gap-4">
      <Link
        href={`/buku/${entry.slug}`}
        aria-hidden="true"
        tabIndex={-1}
        className="@container relative aspect-[2/3] w-[52px] shrink-0 self-start overflow-hidden rounded-[3px_8px_8px_3px] shadow-[0_10px_16px_-10px_rgba(29,43,40,.6)]"
      >
        <BookCover cover={entry.cover} className="rounded-[inherit]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <h3 className="m-0 text-base leading-snug font-bold">
            <Link href={`/buku/${entry.slug}`} className="text-ink no-underline hover:underline">
              {entry.title}
            </Link>
          </h3>
          <p className="m-0 text-[13px] text-ink-3">
            {entry.author} · kembali {formatDay(Date.parse(entry.dueOn))}
          </p>
        </div>

        <div
          role="progressbar"
          aria-label={`Kemajuan membaca ${entry.title}`}
          aria-valuemin={0}
          aria-valuemax={total ?? undefined}
          aria-valuenow={saved}
          aria-valuetext={total ? `Halaman ${saved} dari ${total}` : `Halaman ${saved}`}
          className="h-2.5 overflow-hidden rounded-full bg-[#E1E6DF]"
        >
          <span
            className={cn("block h-full rounded-full transition-[width] duration-700", done ? "bg-accent-600" : "bg-primary-600")}
            style={{ width: `${pct ?? (saved > 0 ? 100 : 0)}%` }}
          />
        </div>
        <p className="m-0 text-sm text-ink-2">
          {total ? (
            <>
              Halaman <strong className="text-ink tabular-nums">{saved}</strong> dari{" "}
              <span className="tabular-nums">{total}</span>
              <span className="text-ink-3"> · {pct}%</span>
              {done && <strong className="ml-1.5 text-accent-700">Selesai dibaca</strong>}
            </>
          ) : (
            <>
              Halaman <strong className="text-ink tabular-nums">{saved}</strong>
              <span className="text-ink-3"> · jumlah halaman buku belum tercatat</span>
            </>
          )}
        </p>

        <form onSubmit={save} noValidate className="flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="text-[13px] font-semibold text-ink-2">
            Halaman terakhir dibaca
          </label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={0}
            max={total ?? undefined}
            value={value}
            onChange={(ev) => {
              setValue(ev.target.value);
              setMessage(null);
            }}
            className="min-h-11 w-24 rounded-[14px] border-[1.5px] border-field bg-white px-3 text-center text-[15px] text-ink tabular-nums transition focus:border-primary-600 focus:shadow-[0_0_0_4px_rgba(46,90,82,.15)] focus:outline-none"
          />
          <button type="submit" disabled={busy} aria-busy={busy} className={cn(ui.btn, ui.ghost, "min-h-11 px-4 text-sm")}>
            {busy ? <Spinner size={16} /> : <Check size={16} />}
            Simpan
          </button>
        </form>
      </div>
    </article>
  );
}
