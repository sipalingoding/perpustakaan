import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, CalendarClock, CheckCircle, Clock, History, Star } from "@/components/icons";
import { formatRating } from "@/components/Stars";
import { CoverMotif } from "@/components/catalog/CoverMotif";
import type { Book } from "@/lib/books";
import { cn } from "@/lib/cn";

type Tag = { label: string; className: string; icon: ReactNode };

/**
 * Status di kartu katalog. Bentuknya mengikuti arti: tersedia = tag padat (satu-satunya yang mengajak meminjam),
 * dipinjam = tag lembut dengan tanggal kembali, terbooking = garis putus-putus (sama dengan buku terbooking di Jadwal),
 * milik sendiri = biru.
 */
function statusTag(b: Book): Tag {
  const base = "inline-flex items-center gap-1.5 rounded-lg px-2 py-[3px] text-xs leading-5 font-bold";
  switch (b.status) {
    case "tersedia":
      return { label: "Tersedia", className: cn(base, "bg-primary-600 text-cream"), icon: <CheckCircle size={14} /> };
    case "saya":
      return {
        label: "Sedang kamu pinjam",
        className: cn(base, "bg-secondary-100 text-secondary-700"),
        icon: <Clock size={14} />,
      };
    case "dipinjam":
      return {
        label: b.due ? `Kembali ${b.due}` : "Dipinjam",
        className: cn(base, "bg-accent-100 text-accent-700"),
        icon: <Clock size={14} />,
      };
    case "terbooking":
      return b.bookedByMe
        ? {
            label: `Kamu booking · ambil ${b.due}`,
            className: cn(base, "border-[1.5px] border-dashed border-secondary-400 py-[1.5px] text-secondary-700"),
            icon: <CalendarClock size={14} />,
          }
        : {
            label: "Terbooking",
            className: cn(base, "border-[1.5px] border-dashed border-accent-400 py-[1.5px] text-accent-700"),
            icon: <CalendarClock size={14} />,
          };
  }
}

/** Kartu buku di katalog. Saat disorot, sampulnya membuka sedikit. */
export function BookCard({ book, style }: { book: Book; style?: CSSProperties }) {
  const tag = statusTag(book);
  return (
    <Link
      href={`/buku/${book.slug}`}
      className="group flex animate-rise flex-col gap-[18px] text-ink no-underline hover:text-ink"
      style={style}
    >
      <span className="book-3d">
        <span className="edge" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="ruled absolute inset-x-0 top-1 bottom-1 flex flex-col items-end justify-end rounded-[2px_8px_8px_2px] bg-paper px-[7cqw] py-[9cqw] text-right"
        >
          <span className="inline-flex items-center gap-[1.4cqw] text-[5.4cqw] font-bold text-primary-600">
            Buka buku
            <ArrowRight className="size-[1.25em]" />
          </span>
        </span>
        <span
          aria-hidden="true"
          className="cover spine-shade absolute inset-0 flex flex-col gap-[3cqw] rounded-[3px_10px_10px_3px] pt-[10cqw] pr-[8cqw] pb-[8cqw] pl-[12cqw]"
          style={{ backgroundColor: book.cover.bg, color: book.cover.ink }}
        >
          <span className="text-[4.4cqw] font-bold tracking-[0.22em] uppercase">{book.category}</span>
          <span className="display text-[9cqw] leading-[1.08]">{book.title}</span>
          <span className="flex flex-1 items-center justify-center">
            <CoverMotif motif={book.motif} className="block h-auto w-[74%]" />
          </span>
          <span className="text-[5cqw] font-semibold">{book.author}</span>
          {book.coverImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- sampul sudah diperkecil di server */}
              <img
                src={book.coverImage}
                alt=""
                loading="lazy"
                className="absolute inset-0 size-full rounded-[inherit] object-cover"
              />
              <span className="spine-shade absolute inset-0 rounded-[inherit]" />
            </>
          )}
        </span>
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[15px] leading-snug font-bold min-[561px]:text-[17px]">{book.title}</span>
        <span className="text-sm text-ink-3">{book.author}</span>
        <span className="mt-1.5 flex flex-col items-start gap-1.5">
          <span className={tag.className}>
            {tag.icon}
            {tag.label}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
                book.timesBorrowed ? "text-ink-2" : "text-muted",
              )}
            >
              <History size={14} aria-hidden="true" />
              {book.timesBorrowed ? `${book.timesBorrowed}× dipinjam` : "Belum pernah dipinjam"}
            </span>
            {book.rating && book.rating.count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 tabular-nums">
                <Star size={14} aria-hidden="true" className="text-accent-600" />
                {formatRating(book.rating.avg)}
                <span className="font-normal text-ink-3">({book.rating.count})</span>
                <span className="sr-only"> dari 5 bintang, {book.rating.count} ulasan</span>
              </span>
            )}
          </span>
        </span>
      </span>
    </Link>
  );
}
