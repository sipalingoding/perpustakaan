"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CoverMotif } from "@/components/catalog/CoverMotif";
import { ChevronLeft, ChevronRight, OpenBook } from "@/components/icons";
import { CoverWaves } from "@/components/illustrations/CoverWaves";
import { PaperBoat } from "@/components/illustrations/PaperBoat";
import { SproutBook } from "@/components/illustrations/SproutBook";
import { RoundButton } from "@/components/RoundButton";
import { ui } from "@/components/ui";
import type { Book, ReaderPage, Spread } from "@/lib/books";
import { cn } from "@/lib/cn";

type Dir = "next" | "prev";
const TURN_MS = 900;

/** Menjadwalkan timeout yang otomatis dibatalkan saat komponen dilepas. */
function useTimers() {
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
}

function spreadLabel(spread: Spread, index: number) {
  if (index === 0) return "Sampul dalam · halaman judul";
  const folios = spread.map((p) => (p && p.kind === "text" ? p.folio : "")).filter(Boolean);
  const isEnd = spread[1].kind === "end";
  const pages = folios.length ? `Halaman ${folios.join("–")}` : "Catatan";
  return isEnd ? `${pages} · akhir cuplikan` : pages;
}

/**
 * Buku 3D di halaman detail. Sampul membuka sendiri saat halaman dimuat,
 * lalu halamannya bisa dibalik maju-mundur atau bukunya ditutup lagi.
 */
export function BookReader({ book }: { book: Book }) {
  const { spreads } = book;
  const [open, setOpen] = useState(false);
  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState<Dir | null>(null);
  const [riffle, setRiffle] = useState(false);
  const later = useTimers();

  const openBook = useCallback(() => {
    setOpen(true);
    setRiffle(true);
    later(() => setRiffle(false), 2300);
  }, [later]);

  useEffect(() => {
    later(openBook, 700);
  }, [later, openBook]);

  const closeBook = () => {
    setOpen(false);
    setSpread(0);
    setTurning(null);
    setRiffle(false);
  };

  const turn = (dir: Dir) => {
    if (!open || turning) return;
    const to = spread + (dir === "next" ? 1 : -1);
    if (to < 0 || to >= spreads.length) return;
    setTurning(dir);
    later(() => {
      setSpread(to);
      setTurning(null);
    }, TURN_MS);
  };

  // Halaman yang terlihat selama dan sesudah membalik.
  const leftIndex = turning === "prev" ? spread - 1 : spread;
  const rightIndex = turning === "next" ? spread + 1 : spread;
  const left = spreads[Math.max(leftIndex, 0)][0];
  const right = spreads[rightIndex][1];
  let front: ReaderPage | null = null;
  let back: ReaderPage | null = null;
  if (turning === "next") {
    front = spreads[spread][1];
    back = spreads[spread + 1][0];
  } else if (turning === "prev") {
    front = spreads[spread - 1][1];
    back = spreads[spread][0];
  }

  return (
    <div className="relative flex flex-col items-center gap-[26px] overflow-hidden rounded-3xl bg-primary-100 px-3 pt-11 pb-6 before:absolute before:-inset-x-[10%] before:-bottom-[140px] before:h-[280px] before:rounded-[50%] before:bg-primary-200 before:content-[''] sm:rounded-[32px] sm:px-6 sm:pt-16 sm:pb-7">
      <div className="reader aspect-[68/44] w-[min(680px,100%)]" data-open={open}>
        <div className="page-block" aria-hidden="true" />

        <div className="page page-r gutter-r">
          <PageView page={right} book={book} />
        </div>

        {open && leftIndex > 0 && left && (
          <div className="page page-l gutter-l">
            <PageView page={left} book={book} />
          </div>
        )}

        {riffle &&
          [0.75, 0.9, 1.05].map((delay) => (
            <div key={delay} className="riffle" style={{ animationDelay: `${delay}s` }} aria-hidden="true" />
          ))}

        <div className="cover" aria-hidden="true">
          <div
            className="face front spine-shade flex flex-col items-center gap-[1.6cqw] pt-[5cqw] pr-[4cqw] pb-[4cqw] pl-[5cqw] text-center"
            style={{ backgroundColor: book.cover.bg, color: book.cover.ink }}
          >
            <div className="absolute inset-[2.4cqw] rounded-lg border-[1.5px] border-current opacity-35" />
            <span className="mt-[2.4cqw] text-[1.5cqw] font-bold tracking-[0.26em] uppercase">{book.form}</span>
            <span className="display max-w-[84%] text-[4cqw] leading-[1.1]">{book.title}</span>
            {book.motif === "waves" ? (
              <CoverWaves className="mt-[1cqw] h-auto w-[76%]" />
            ) : (
              <CoverMotif motif={book.motif} className="mt-[2cqw] h-auto w-[56%]" />
            )}
            <span className="mt-auto text-[1.8cqw] font-semibold tracking-[0.08em]">{book.author}</span>
            {book.coverImage && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- sampul sudah diperkecil di server */}
                <img
                  src={book.coverImage}
                  alt=""
                  className="absolute inset-0 size-full rounded-[inherit] object-cover"
                />
                <span className="spine-shade absolute inset-0 rounded-[inherit]" />
              </>
            )}
          </div>
          <div className="face back endpaper flex items-center justify-center">
            <Bookplate />
          </div>
        </div>

        {turning && front && back && (
          <div key={`${turning}-${spread}`} className="turning" data-dir={turning} aria-hidden="true">
            <div className="face front gutter-r rounded-[2px_10px_10px_2px] shadow-[0_10px_30px_-12px_rgba(29,43,40,.35)]">
              <PageView page={front} book={book} />
            </div>
            <div className="face back gutter-l rounded-[10px_2px_2px_10px]">
              <PageView page={back} book={book} />
            </div>
          </div>
        )}
      </div>

      <div className="relative z-[1] flex flex-wrap items-center justify-center gap-3">
        <RoundButton
          size="lg"
          label="Halaman sebelumnya"
          disabled={!open || spread === 0 || !!turning}
          onClick={() => turn("prev")}
        >
          <ChevronLeft />
        </RoundButton>
        <button type="button" className={cn(ui.btn, ui.primary)} onClick={open ? closeBook : openBook}>
          <OpenBook />
          {open ? "Tutup buku" : "Buka buku"}
        </button>
        <RoundButton
          size="lg"
          label="Halaman berikutnya"
          disabled={!open || spread >= spreads.length - 1 || !!turning}
          onClick={() => turn("next")}
        >
          <ChevronRight />
        </RoundButton>
      </div>
      <p aria-live="polite" className="relative z-[1] m-0 text-[13px] font-semibold text-ink-2">
        {open ? spreadLabel(spreads[spread], spread) : "Buku tertutup. Tekan “Buka buku” untuk membaca cuplikan"}
      </p>
    </div>
  );
}

function Bookplate() {
  return (
    <div className="flex w-[64%] flex-col items-center gap-[1cqw] rounded-[10px] border-[1.5px] border-primary-400 bg-paper px-[2.6cqw] py-[3cqw] text-center shadow-[0_0_0_5px_var(--color-paper),0_0_0_6.5px_var(--color-primary-400)]">
      <span className="text-[1.4cqw] font-bold tracking-[0.3em] text-primary-500 uppercase">Ex libris</span>
      <span className="display text-[3cqw] leading-[1.05] text-ink">Perpustakaan Lembar</span>
      <span className="text-[1.4cqw] text-muted">No. inventaris [NOMOR]</span>
    </div>
  );
}

function PageView({ page, book }: { page: ReaderPage; book: Book }) {
  return (
    <div className="flex h-full flex-col gap-[2.2cqw] px-[5.2cqw] pt-[5.4cqw] pb-[3.4cqw] text-[#2B3835]">
      {page.kind === "title" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-[1.5cqw] text-center">
          <span className="text-[1.5cqw] font-bold tracking-[0.24em] text-accent-700 uppercase">{book.form}</span>
          <span className="display text-[3.6cqw] leading-[1.1] text-ink">{book.title}</span>
          <span className="text-[1.8cqw] font-semibold tracking-[0.06em] text-ink-3">{book.author}</span>
          {book.motif === "waves" ? (
            <PaperBoat className="mt-[1.4cqw] h-auto w-[64%]" />
          ) : (
            <span style={{ color: book.cover.bg }} className="mt-[1.4cqw] block w-[48%]">
              <CoverMotif motif={book.motif} className="block h-auto w-full" />
            </span>
          )}
          <span className="mt-auto text-[1.3cqw] font-semibold tracking-[0.22em] text-muted uppercase">
            Lembar · Koleksi {book.category.toLowerCase()}
          </span>
        </div>
      )}
      {page.kind === "text" && (
        <>
          {page.heading && (
            <div className="flex flex-col gap-[1cqw]">
              {page.eyebrow && (
                <span className="text-[1.5cqw] font-bold tracking-[0.24em] text-accent-700 uppercase">
                  {page.eyebrow}
                </span>
              )}
              <span className="display block text-[2.9cqw] leading-[1.12] text-ink">{page.heading}</span>
            </div>
          )}
          <p className="m-0 text-[1.85cqw] leading-[1.6] text-pretty">{page.body}</p>
          {page.folio && (
            <span className="mt-auto self-center text-[1.6cqw] font-semibold text-muted">{page.folio}</span>
          )}
        </>
      )}
      {page.kind === "end" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-[1.6cqw] text-center">
          <SproutBook className="h-auto w-[42%]" />
          <span className="display text-[3.4cqw] leading-[1.1] text-ink">{page.title}</span>
          <p className="m-0 max-w-[30ch] text-[1.85cqw] leading-normal text-ink-3">{page.body}</p>
        </div>
      )}
    </div>
  );
}
