"use client";

import { useState, type FormEvent } from "react";
import { saveReadingProgress } from "@/app/profil/actions";
import { Check, Spinner } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/Toast";

/**
 * Tracking halaman bacaan untuk satu pinjaman aktif: bilah kemajuan dan isian halaman terakhir yang dibaca.
 * Dipakai di Profil (Sedang dibaca) dan di Jadwal (Sedang dipinjam). Menyimpan lewat saveReadingProgress.
 */
export function ReadingProgress({
  loanId,
  title,
  pages,
  currentPage,
}: {
  loanId: string;
  title: string;
  /** Total halaman buku; null = belum tercatat di katalog. */
  pages: number | null;
  currentPage: number;
}) {
  const [saved, setSaved] = useState(currentPage);
  const [value, setValue] = useState(String(currentPage || ""));
  const [busy, setBusy] = useState(false);
  const notify = useToast();
  // Judul buku jadi judul notifikasi, karena beberapa buku bisa dicatat di halaman yang sama.
  const setMessage = (m: { kind: "ok" | "error"; text: string } | null) => notify(m && { ...m, title });
  const total = pages;
  const pct = total ? Math.min(100, Math.round((saved / total) * 100)) : null;
  const done = total !== null && saved >= total;
  const inputId = `hal-${loanId}`;

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
      const result = await saveReadingProgress(loanId, page);
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
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label={`Kemajuan membaca ${title}`}
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
  );
}
