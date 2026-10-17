"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { borrowBook } from "@/app/buku/[slug]/actions";
import { DateChip } from "@/components/DateChip";
import { ArrowRight, CalendarCheck, Spinner } from "@/components/icons";
import { ui } from "@/components/ui";
import type { Book } from "@/lib/books";
import { cn } from "@/lib/cn";
import { DAY, formatDay, formatLong, formatShort } from "@/lib/dates";
import { HourPicker, hoursForDate } from "@/components/HourPicker";
import { formatHour, LIBRARY } from "@/lib/library";
import { useToast } from "@/components/Toast";

const DURATIONS = [7, 14, 21] as const;

export type MyBookLoan = { status: "active" | "reserved"; startOn: string; dueOn: string; pickupHour: number | null };

/**
 * Panel peminjaman: pilih tanggal dan jam ambil (hari ini sampai 7 hari ke depan) dan lama pinjam.
 * Tanggal kembali dihitung otomatis; tombol mem-booking satu eksemplar yang kosong (status "terbooking"),
 * yang jadi "dipinjam" setelah pustakawan menyetujui pengambilannya di meja sirkulasi.
 */
export function BorrowPanel({
  book,
  signedIn,
  schedule,
  mine,
}: {
  book: Book;
  signedIn: boolean;
  /** Pilihan tanggal dan jam ambil, dihitung di server dari waktu Jakarta. */
  schedule: { dates: string[]; todayFirstHour: number | null };
  mine?: MyBookLoan;
}) {
  const { dates, todayFirstHour } = schedule;
  const times = dates.map((d) => Date.parse(d));
  const [pick, setPick] = useState(0);
  const [hour, setHour] = useState(() => hoursForDate(0, todayFirstHour)[0]);
  const choose = (i: number) => {
    setPick(i);
    // Jam yang dipilih tetap, kecuali sudah lewat di tanggal baru (mis. pindah ke hari ini).
    const open = hoursForDate(i, todayFirstHour);
    if (!open.includes(hour)) setHour(open[0]);
  };
  const [days, setDays] = useState<(typeof DURATIONS)[number]>(14);
  const notify = useToast();
  const [pending, startTransition] = useTransition();
  const pickup = times[pick];
  const due = pickup + days * DAY;

  const submit = () => {
    startTransition(async () => {
      const result = await borrowBook({ slug: book.slug, pickupOn: dates[pick], pickupHour: hour, days });
      notify(
        result.ok
          ? {
              kind: "ok",
              title: "Peminjaman tercatat",
              text: `Ambil “${book.title}” ${formatDay(pickup)}, pukul ${formatHour(hour)}.`,
              action: { href: "/jadwal", label: "Lihat jadwal" },
            }
          : { kind: "error", text: result.error },
      );
    });
  };

  return (
    <section
      aria-labelledby="pinjam-h"
      className="flex flex-col gap-5 rounded-[26px] border border-line bg-cream p-[26px] shadow-[0_30px_50px_-40px_rgba(29,43,40,.5)]"
    >
      <h2 id="pinjam-h" className="display m-0 text-[32px] leading-none">
        Atur peminjaman
      </h2>

      {mine ? (
        <>
          <Notice>
            {mine.status === "reserved" ? (
              <>
                <strong className="mb-1 block text-accent-700">Terbooking untukmu</strong>
                Datang ke meja sirkulasi pada <strong>{formatDay(Date.parse(mine.startOn))}</strong>
                {mine.pickupHour !== null ? (
                  <>
                    , pukul <strong>{formatHour(mine.pickupHour)}</strong>
                  </>
                ) : (
                  <> (jam layanan {LIBRARY.hours})</>
                )}
                . Buku tercatat dipinjam setelah petugas menyerahkannya, dan masa pinjam dihitung mulai hari itu. Kalau
                tidak diambil sampai akhir hari itu, booking batal otomatis dan buku terbuka untuk anggota lain.
              </>
            ) : (
              <>
                Buku ini sedang kamu pinjam. Kembalikan ke meja sirkulasi sebelum{" "}
                <strong>{formatDay(Date.parse(mine.dueOn))}</strong>.
              </>
            )}
          </Notice>
          <Link href="/jadwal" className={cn(ui.btn, ui.primary)}>
            Lihat jadwal saya
            <ArrowRight />
          </Link>
        </>
      ) : book.copies.available === 0 ? (
        <Notice>
          {book.status === "terbooking"
            ? "Semua eksemplar sedang dibooking anggota lain dan belum diambil. Coba lagi beberapa hari lagi."
            : "Semua eksemplar sedang dipinjam anggota lain."}
          {book.status === "dipinjam" && book.due && (
            <>
              {" "}
              Perkiraan kembali ke rak: <strong>{book.due}</strong>.
            </>
          )}
        </Notice>
      ) : !signedIn ? (
        <>
          <Notice>Masuk dengan kartu anggotamu untuk memilih tanggal ambil dan meminjam buku ini.</Notice>
          <Link href={`/masuk?lanjut=${encodeURIComponent(`/buku/${book.slug}`)}`} className={cn(ui.btn, ui.primary)}>
            Masuk untuk meminjam
            <ArrowRight />
          </Link>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            <span className={ui.label}>
              Ambil di perpustakaan · {formatShort(times[0])} sampai {formatShort(times[times.length - 1])}
            </span>
            <div className="flex flex-wrap gap-2">
              {times.map((t, i) => (
                <DateChip key={t} time={t} selected={i === pick} onSelect={() => choose(i)} />
              ))}
            </div>
          </div>
          <HourPicker
            label="Jam kedatangan"
            available={hoursForDate(pick, todayFirstHour)}
            value={hour}
            onChange={setHour}
          />
          <div className="flex flex-col gap-2.5">
            <span className={ui.label}>Lama peminjaman</span>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((n) => (
                <button key={n} type="button" className={ui.chip} aria-pressed={n === days} onClick={() => setDays(n)}>
                  {n} hari
                </button>
              ))}
            </div>
          </div>
          <div aria-live="polite" className="flex items-start gap-3.5 rounded-[18px] bg-primary-100 px-[18px] py-4">
            <CalendarCheck className="mt-0.5 shrink-0 text-primary-600" />
            <div>
              <span className="block text-[13px] font-semibold text-ink-3">Kembalikan paling lambat</span>
              <span className="display mt-0.5 block text-[26px] leading-tight">{formatLong(due)}</span>
              <span className="mt-1 block text-[13px] text-ink-3">
                Diambil {formatDay(pickup)}, pukul {formatHour(hour)} · {days} hari
              </span>
            </div>
          </div>
          <button
            type="button"
            className={cn(ui.btn, ui.primary, "disabled:cursor-wait disabled:opacity-80")}
            onClick={submit}
            disabled={pending}
            aria-busy={pending}
          >
            Ajukan peminjaman
            {pending ? <Spinner /> : <ArrowRight />}
          </button>
          <p className="m-0 -mt-2 text-[13px] leading-snug text-ink-3">
            Buku langsung terbooking untukmu. Ambil di hari yang kamu pilih; kalau terlewat, booking batal otomatis.
          </p>
        </>
      )}
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5 rounded-[18px] bg-primary-100 px-[18px] py-4">
      <CalendarCheck className="mt-0.5 shrink-0 text-primary-600" />
      <p className="m-0 text-[15px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}
