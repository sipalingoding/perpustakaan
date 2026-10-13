"use client";

import { useEffect, useId, useRef, useState } from "react";
import { returnBook, type ReturnResult } from "@/app/jadwal/actions";
import { Alert, Check, Cross, Spinner, Star, StarOutline } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fineFor, overdueDays, rupiah } from "@/lib/fine";
import type { ScheduleLoan } from "@/lib/server/schedule";

const LABELS = ["Tidak suka", "Kurang", "Lumayan", "Bagus", "Luar biasa"];
const BODY_MAX = 1000;

/**
 * Popup pengembalian: ulasan dan rating 1–5 bintang, lalu pengembalian diajukan (pustakawan yang menerima bukunya). Rating wajib bila ingin mengirim ulasan;
 * anggota yang tidak ingin mengulas tetap bisa mengembalikan lewat "Ajukan tanpa ulasan".
 */
export function ReturnDialog({
  loan,
  today,
  onClose,
  onReturned,
}: {
  loan: ScheduleLoan;
  today: number;
  onClose: () => void;
  onReturned: (result: Extract<ReturnResult, { ok: true }>) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [rating, setRating] = useState(loan.myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(loan.myReview?.body ?? "");
  const [busy, setBusy] = useState<"review" | "plain" | null>(null);
  const [error, setError] = useState("");
  const lateDays = overdueDays(loan.due, today);
  const shown = hover || rating;

  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  const submit = async (withReview: boolean) => {
    if (withReview && rating === 0) {
      setError("Pilih 1 sampai 5 bintang dulu, atau ajukan tanpa ulasan.");
      return;
    }
    setBusy(withReview ? "review" : "plain");
    setError("");
    try {
      const result = await returnBook(loan.id, withReview ? { rating, body } : null);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        return;
      }
      onReturned(result);
    } catch {
      setError("Gagal menyimpan. Periksa koneksi lalu coba lagi.");
      setBusy(null);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-h`}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(560px,calc(100vw-32px))] max-w-none animate-pop overflow-y-auto rounded-[26px] border border-line bg-paper p-0 text-ink shadow-[0_40px_80px_-30px_rgba(29,43,40,.6)] backdrop:bg-[rgb(18_26_24/0.55)]"
    >
      <div className="flex flex-col gap-5 p-6 min-[480px]:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span
              aria-hidden="true"
              className="spine-shade relative h-[84px] w-[58px] shrink-0 overflow-hidden rounded-[3px_8px_8px_3px] shadow-[0_10px_16px_-10px_rgba(29,43,40,.6)]"
              style={{ backgroundColor: loan.color }}
            >
              {loan.cover && (
                // eslint-disable-next-line @next/next/no-img-element -- sampul kecil dari rute sendiri
                <img src={loan.cover} alt="" className="absolute inset-0 size-full object-cover" />
              )}
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-semibold text-ink-3">Kembalikan buku</p>
              <h2 id={`${id}-h`} className="display m-0 text-[26px] leading-tight">
                {loan.title}
              </h2>
              <p className="m-0 mt-0.5 text-sm text-ink-3">{loan.author}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            aria-label="Tutup"
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-2 hover:bg-hover"
          >
            <Cross size={22} />
          </button>
        </div>

        {lateDays > 0 ? (
          <p className="m-0 flex gap-2.5 rounded-[14px] bg-accent-50 px-4 py-3 text-sm leading-relaxed text-accent-700">
            <Alert size={20} className="mt-0.5 shrink-0" />
            <span>
              Terlambat {lateDays} hari, denda sampai hari ini <strong>{rupiah(fineFor(lateDays))}</strong>. Denda
              berhenti dihitung saat pustakawan menerima bukunya di meja sirkulasi.
            </span>
          </p>
        ) : (
          <p className="m-0 text-sm leading-relaxed text-ink-2">
            Setelah diajukan, serahkan bukunya ke meja sirkulasi. Statusnya berubah setelah pustakawan menerimanya.
            Sebelum itu, bagaimana bukunya menurutmu?
          </p>
        )}

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className={cn(ui.label, "mb-2 p-0")}>Rating</legend>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex" onMouseLeave={() => setHover(0)}>
              {LABELS.map((label, i) => {
                const value = i + 1;
                const on = shown >= value;
                return (
                  <label
                    key={value}
                    onMouseEnter={() => setHover(value)}
                    className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-primary-600"
                  >
                    <input
                      type="radio"
                      name={`${id}-rating`}
                      value={value}
                      checked={rating === value}
                      onChange={() => {
                        setRating(value);
                        setError("");
                      }}
                      className="sr-only"
                    />
                    <span className="sr-only">
                      {value} bintang, {label.toLowerCase()}
                    </span>
                    {on ? (
                      <Star size={34} className="text-accent-600" />
                    ) : (
                      <StarOutline size={34} className="text-ink-3" />
                    )}
                  </label>
                );
              })}
            </div>
            <span aria-hidden="true" className="min-w-[10ch] text-[15px] font-semibold text-ink-2">
              {shown ? LABELS[shown - 1] : "Belum dipilih"}
            </span>
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between gap-3">
            <span className={ui.label}>Ulasan (boleh kosong)</span>
            <span className="text-xs text-muted tabular-nums">
              {body.length}/{BODY_MAX}
            </span>
          </span>
          <textarea
            rows={4}
            maxLength={BODY_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Apa yang paling kamu ingat dari buku ini? Untuk siapa kamu merekomendasikannya?"
            className={cn(ui.field, "py-3 leading-relaxed")}
          />
          {loan.myReview && (
            <span className="text-[13px] text-ink-3">
              Kamu pernah mengulas buku ini. Ulasan lamamu akan diganti dengan yang ini.
            </span>
          )}
        </label>

        <div role="alert" className="empty:hidden">
          {error && (
            <p className="m-0 rounded-[14px] bg-accent-50 px-4 py-3 text-sm leading-snug text-accent-700">{error}</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 min-[480px]:flex-row-reverse min-[480px]:flex-wrap min-[480px]:items-center">
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={!!busy}
            aria-busy={busy === "review"}
            className={cn(ui.btn, ui.primary, "disabled:cursor-wait")}
          >
            {busy === "review" ? <Spinner /> : <Check />}
            Ajukan & kirim ulasan
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={!!busy}
            aria-busy={busy === "plain"}
            className={cn(ui.btn, ui.ghost, "disabled:cursor-wait")}
          >
            {busy === "plain" && <Spinner />}
            Ajukan tanpa ulasan
          </button>
        </div>
      </div>
    </dialog>
  );
}
