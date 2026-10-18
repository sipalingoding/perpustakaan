"use client";

import Link from "next/link";
import { BookCover } from "@/components/catalog/BookCover";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ArrowRight } from "@/components/icons";
import { LadderReader } from "@/components/illustrations/LadderReader";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/dates";
import type { Gender } from "@/lib/people";
import type { ReadingEntry } from "@/lib/server/profile-page";

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
        <ReadingProgress loanId={entry.loanId} title={entry.title} pages={entry.pages} currentPage={entry.currentPage} />
      </div>
    </article>
  );
}
