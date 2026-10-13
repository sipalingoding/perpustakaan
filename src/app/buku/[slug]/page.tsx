import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookReader } from "@/components/detail/BookReader";
import { BookReviews } from "@/components/detail/BookReviews";
import { formatRating, Stars } from "@/components/Stars";
import { BorrowPanel } from "@/components/detail/BorrowPanel";
import { BookSkeleton, BorrowSkeleton } from "@/components/Skeleton";
import { PageShell } from "@/components/layout/PageShell";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getBook, getBookSlugs } from "@/lib/server/catalog";
import { getMyBookLoan, pickupSchedule } from "@/lib/server/loans";
import { getBookReviews } from "@/lib/server/reviews";
import { getViewer } from "@/lib/server/session";

export async function generateStaticParams() {
  return (await getBookSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/buku/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  return book ? { title: book.title, description: book.synopsis } : { title: "Buku tidak ditemukan" };
}

export default function BukuPage({ params }: PageProps<"/buku/[slug]">) {
  // params baru diketahui saat permintaan untuk slug yang belum dibuat, jadi dibaca di dalam Suspense.
  return (
    <PageShell active="katalog">
      <Suspense fallback={<BookSkeleton />}>
        <Buku params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Buku({ params }: { params: PageProps<"/buku/[slug]">["params"] }) {
  const { slug } = await params;
  const [book, reviews] = await Promise.all([getBook(slug), getBookReviews(slug)]);
  if (!book) notFound();

  const meta = [
    ...(book.pages ? [{ label: "Halaman", value: String(book.pages) }] : []),
    ...(book.year ? [{ label: "Terbit", value: String(book.year) }] : []),
    { label: "Bahasa", value: book.language || "Indonesia" },
    { label: "Lokasi rak", value: book.shelf },
    ...(book.publisher ? [{ label: "Penerbit", value: book.publisher }] : []),
    ...(book.isbn ? [{ label: "ISBN", value: book.isbn }] : []),
  ];

  return (
    <div className={ui.wrap}>
      <nav aria-label="Jejak halaman" className="pt-[22px] pb-5">
        <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-sm text-ink-3">
          <li>
            <Link href="/">Katalog</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/#katalog">{book.category}</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-ink">
            {book.title}
          </li>
        </ol>
      </nav>

      {/* Lebar: buku dan ulasan di kiri, info dan panel pinjam di kanan sepanjang dua baris. Sempit: buku, info, ulasan. */}
      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 min-[990px]:grid-cols-[minmax(0,1fr)_400px] min-[990px]:grid-rows-[auto_1fr]">
        <div className="min-w-0">
          <BookReader book={book} />
        </div>

        <div className="flex min-w-0 animate-fade-up flex-col gap-[22px] [animation-delay:.2s] min-[990px]:col-start-2 min-[990px]:row-span-2 min-[990px]:row-start-1">
          <div className="flex flex-wrap gap-2">
            {[book.category, book.form].map((tag) => (
              <span
                key={tag}
                className="inline-flex min-h-[30px] items-center rounded-full bg-hover px-3 text-[13px] font-semibold text-ink-2"
              >
                {tag}
              </span>
            ))}
          </div>
          <div>
            <h1 className="display m-0 text-[clamp(40px,4.6vw,60px)] leading-[1.02]">{book.title}</h1>
            <p className="mt-3 mb-0 text-base text-ink-3">
              oleh <strong className="text-ink">{book.author}</strong>
            </p>
            <a
              href="#ulasan"
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-2 no-underline hover:text-ink"
            >
              {reviews.count > 0 ? (
                <>
                  <Stars value={reviews.avg} />
                  <span className="tabular-nums">
                    {formatRating(reviews.avg)} · {reviews.count} ulasan
                  </span>
                </>
              ) : (
                <span className="text-ink-3 underline underline-offset-2">Belum ada ulasan</span>
              )}
            </a>
          </div>
          <p className="m-0 max-w-[52ch] text-base leading-[1.7] text-ink-2">{book.synopsis}</p>
          <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-line bg-line">
            {meta.map((m) => (
              <div key={m.label} className="bg-[#F4F6F1] px-4 py-3.5">
                <dt className="text-xs font-semibold text-muted">{m.label}</dt>
                <dd className="mt-1 mb-0 text-[17px] font-bold text-ink">{m.value}</dd>
              </div>
            ))}
          </dl>
          <p className="m-0 flex items-center gap-3 text-[15px] text-ink-2">
            <span
              aria-hidden="true"
              className={cn(
                "size-2.5 rounded-full",
                book.copies.available > 0
                  ? "bg-primary-500 shadow-[0_0_0_4px_var(--color-primary-100)]"
                  : "bg-accent-700 shadow-[0_0_0_4px_var(--color-accent-100)]",
              )}
            />
            <span>
              <strong>
                {book.copies.available} dari {book.copies.total} eksemplar
              </strong>{" "}
              tersedia di rak {book.shelf}
            </span>
          </p>
          {/* Tanggal hari ini dan status pinjaman anggota baru diketahui saat permintaan, jadi panel dimuat terpisah. */}
          <Suspense fallback={<BorrowSkeleton />}>
            <MyBorrowPanel book={book} />
          </Suspense>
        </div>

        <div className="min-w-0 min-[990px]:col-start-1 min-[990px]:row-start-2">
          <BookReviews summary={reviews} title={book.title} />
        </div>
      </div>
    </div>
  );
}

async function MyBorrowPanel({ book }: { book: NonNullable<Awaited<ReturnType<typeof getBook>>> }) {
  const viewer = await getViewer();
  const [mineBook, mine, schedule] = await Promise.all([
    viewer ? getBook(book.slug, viewer.id) : undefined,
    viewer ? getMyBookLoan(viewer.id, book.slug) : undefined,
    pickupSchedule(),
  ]);
  return <BorrowPanel book={mineBook ?? book} signedIn={!!viewer} schedule={schedule} mine={mine} />;
}
