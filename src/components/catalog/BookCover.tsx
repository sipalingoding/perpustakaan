import { CoverMotif } from "@/components/catalog/CoverMotif";
import type { Motif } from "@/lib/books";
import { cn } from "@/lib/cn";

export type CoverData = {
  title: string;
  author: string;
  category: string;
  motif: Motif;
  bg: string;
  ink: string;
  /** Gambar sampul asli; kosong = sampul ilustrasi. */
  image: string | null;
};

/**
 * Sampul buku seperti di katalog: gambar sampul bila ada, selain itu sampul ilustrasi (kategori, judul, motif, penulis).
 * Ukurannya dalam cqw, jadi induknya harus container (`@container` atau .book-3d) dan sampul mengisi induk itu.
 */
export function BookCover({ cover, className }: { cover: CoverData; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "spine-shade absolute inset-0 flex flex-col gap-[3cqw] rounded-[3px_10px_10px_3px] pt-[10cqw] pr-[8cqw] pb-[8cqw] pl-[12cqw]",
        className,
      )}
      style={{ backgroundColor: cover.bg, color: cover.ink }}
    >
      <span className="text-[4.4cqw] font-bold tracking-[0.22em] uppercase">{cover.category}</span>
      <span className="display text-[9cqw] leading-[1.08]">{cover.title}</span>
      <span className="flex flex-1 items-center justify-center">
        <CoverMotif motif={cover.motif} className="block h-auto w-[74%]" />
      </span>
      <span className="text-[5cqw] font-semibold">{cover.author}</span>
      {cover.image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- sampul sudah diperkecil di server */}
          <img src={cover.image} alt="" loading="lazy" className="absolute inset-0 size-full rounded-[inherit] object-cover" />
          <span className="spine-shade absolute inset-0 rounded-[inherit]" />
        </>
      )}
    </span>
  );
}
