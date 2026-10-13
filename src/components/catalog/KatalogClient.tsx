"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCard } from "@/components/catalog/BookCard";
import { SortMenu, type SortOption } from "@/components/catalog/SortMenu";
import { ArrowRight, Search } from "@/components/icons";
import { LibraryHills } from "@/components/illustrations/LibraryHills";
import { ui } from "@/components/ui";
import { CATEGORIES, type Book, type Category } from "@/lib/books";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/dates";
import type { MyLoanSummary } from "@/lib/server/loans";

type Sort = "rak" | "populer" | "rating" | "az" | "tersedia";
const SORTS: SortOption<Sort>[] = [
  { value: "rak", label: "Pilihan pustakawan", hint: "Urutan rak minggu ini" },
  { value: "populer", label: "Terfavorit", hint: "Paling sering dipinjam anggota di atas" },
  { value: "rating", label: "Rating tertinggi", hint: "Rata-rata bintang dari ulasan pembaca" },
  { value: "az", label: "Judul A–Z", hint: "Menurut abjad judul" },
  { value: "tersedia", label: "Tersedia", hint: "Yang bisa langsung dipinjam di atas" },
];

export function KatalogClient({ books: all, myLoans }: { books: Book[]; myLoans: MyLoanSummary[] }) {
  const nearest = myLoans[0];
  const [category, setCategory] = useState<Category | "Semua">("Semua");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("rak");
  // Dinaikkan setiap filter berubah supaya kartu muncul ulang dengan animasi.
  const [round, setRound] = useState(0);

  const refilter = (patch: { category?: Category | "Semua"; query?: string; sort?: Sort }) => {
    if (patch.category !== undefined) setCategory(patch.category);
    if (patch.query !== undefined) setQuery(patch.query);
    if (patch.sort !== undefined) setSort(patch.sort);
    setRound((r) => r + 1);
  };

  const needle = query.trim().toLowerCase();
  let books = all.filter((b) => {
    const inCategory = category === "Semua" || b.category === category;
    const haystack = `${b.title} ${b.author} ${b.category} ${b.tags}`.toLowerCase();
    return inCategory && (!needle || haystack.includes(needle));
  });
  if (sort === "populer") {
    books = [...books].sort(
      (a, b) => (b.timesBorrowed ?? 0) - (a.timesBorrowed ?? 0) || a.title.localeCompare(b.title, "id"),
    );
  }
  if (sort === "rating") {
    books = [...books].sort(
      (a, b) =>
        (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0) ||
        (b.rating?.count ?? 0) - (a.rating?.count ?? 0) ||
        a.title.localeCompare(b.title, "id"),
    );
  }
  if (sort === "az") books = [...books].sort((a, b) => a.title.localeCompare(b.title, "id"));
  if (sort === "tersedia") {
    books = [...books].sort((a, b) => Number(a.status !== "tersedia") - Number(b.status !== "tersedia"));
  }

  return (
    <>
      <section
        className={cn(
          ui.wrap,
          "grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-x-14 gap-y-8 pt-14 pb-9",
        )}
      >
        <div className="flex animate-fade-up flex-col gap-[22px]">
          <h1 className="display m-0 text-[clamp(44px,5.6vw,74px)] leading-[1.08]">
            Buku yang{" "}
            <span className="hero-calm text-primary-600">
              tenang
              <svg viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
                <path
                  d="M2 14 C 22 4, 42 4, 62 14 S 102 24, 122 14 S 162 4, 198 13"
                  pathLength={1}
                  fill="none"
                  stroke="var(--color-primary-300)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            untuk hari yang {/* Kata dan titiknya tidak boleh terpisah baris. */}
            <span className="whitespace-nowrap">
              <BusyWord word="ramai" />.
            </span>
          </h1>
          <div className="due-slip relative max-w-[46ch] -rotate-[0.8deg] rounded-[6px_16px_16px_6px] border border-line py-[15px] pr-7 pl-12 shadow-[0_20px_34px_-26px_rgba(29,43,40,.65)]">
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-3 -translate-y-1/2 rounded-full bg-ground shadow-[inset_0_1px_2px_rgba(29,43,40,.35)]"
            />
            <p className="m-0 text-[17px] leading-[30px] text-ink-2">
              Cari buku yang ingin kamu bawa pulang, lalu baca dengan tenang. Soal kapan harus kembali,{" "}
              <strong className="font-semibold text-ink">biar jadwalmu yang mengingatkan.</strong>
            </p>
            <span
              aria-hidden="true"
              className="absolute -right-2 -bottom-4 rotate-[-10deg] rounded-full border-2 border-accent-600/70 bg-paper/60 px-3 py-0.5 text-[11px] font-bold tracking-[0.12em] text-accent-600 uppercase"
            >
              Lembar
            </span>
          </div>
          <div className="flex max-w-[540px] items-center gap-2.5 rounded-full border-[1.5px] border-line bg-white py-1.5 pr-1.5 pl-5 shadow-[0_18px_40px_-28px_rgba(29,43,40,.5)] transition focus-within:border-primary-600 focus-within:shadow-[0_0_0_4px_rgba(46,90,82,.14)]">
            <Search className="shrink-0 text-ink-3" />
            <label className="sr-only" htmlFor="cari">
              Cari judul, penulis, atau topik
            </label>
            <input
              id="cari"
              type="search"
              placeholder="Cari buku"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none"
            />
            <a href="#katalog" className={cn(ui.btn, ui.primary, "min-h-12")}>
              Cari
            </a>
          </div>
        </div>

        <div className="relative aspect-[640/440] w-full animate-fade-up [animation-delay:.15s]">
          <LibraryHills className="absolute inset-0 block size-full" />
          <Bird left="10%" top="16%" width={64} height={40} />
          <Bird left="30%" top="32%" width={46} height={30} delay="-2.5s" flap="1.1s" />
          <Bird left="48%" top="6%" width={36} height={24} delay="-4.5s" flap="1.5s" />
        </div>
      </section>

      {nearest && (
        <section className={cn(ui.wrap, "animate-fade-up [animation-delay:.3s]")}>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-[18px] rounded-[22px] border border-line bg-cream px-6 py-5">
            <div aria-hidden="true" className="flex h-14 items-end gap-1">
              <span className="h-[52px] w-3.5 rounded-[3px] bg-primary-500" />
              <span className="h-11 w-3 rounded-[3px] bg-secondary-700" />
              <span className="h-14 w-4 rounded-[3px] border-[1.5px] border-dashed border-primary-400 bg-[#E6ECE6]" />
            </div>
            <p className="m-0 flex-[1_1_320px] text-[15px] leading-relaxed text-ink-2">
              Kamu sedang meminjam <strong>{myLoans.length} buku</strong>. Yang paling dekat jatuh tempo:{" "}
              <strong>{nearest.title}</strong>, kembalikan sebelum {formatDay(Date.parse(nearest.dueOn))}.
            </p>
            <Link href="/jadwal" className={cn(ui.btn, ui.ghost)}>
              Lihat jadwal
              <ArrowRight />
            </Link>
          </div>
        </section>
      )}

      <section id="katalog" className={cn(ui.wrap, "flex scroll-mt-6 flex-col gap-[22px] pt-[72px]")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-3.5">
            <h2 className="display m-0 text-5xl leading-none">Katalog</h2>
            <span className="text-sm font-semibold text-muted">{books.length} judul</span>
          </div>
          <SortMenu label="Urutkan" value={sort} options={SORTS} onChange={(s) => refilter({ sort: s })} />
        </div>
        <div className="flex flex-wrap gap-2.5">
          {(["Semua", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={ui.chip}
              aria-pressed={c === category}
              onClick={() => refilter({ category: c })}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-[18px] grid grid-cols-2 gap-x-5 gap-y-9 min-[561px]:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] min-[561px]:gap-x-9 min-[561px]:gap-y-[52px]">
          {books.map((book, i) => (
            <BookCard key={`${book.slug}-${round}`} book={book} style={{ animationDelay: `${i * 70}ms` }} />
          ))}
        </div>

        {books.length === 0 && all.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-3xl border-[1.5px] border-dashed border-field px-6 py-14 text-center">
            <p className="display m-0 text-[28px] leading-tight">Rak masih kosong.</p>
            <p className="m-0 max-w-[44ch] text-[15px] text-ink-3">
              Pustakawan belum menambahkan buku. Kamu bisa membantu lewat halaman Sumbang buku.
            </p>
            <Link href="/sumbang" className={cn(ui.btn, ui.ghost, "mt-2")}>
              Sumbang buku
            </Link>
          </div>
        )}

        {books.length === 0 && all.length > 0 && (
          <div className="flex flex-col items-center gap-3.5 rounded-3xl border-[1.5px] border-dashed border-field px-6 py-14 text-center">
            <svg
              viewBox="0 0 120 80"
              width="120"
              height="80"
              fill="none"
              stroke="#5E7D74"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M60 66c-10-7-26-8-40-5V22c14-3 30-2 40 5 10-7 26-8 40-5v39c-14-3-30-2-40 5z" />
              <path d="M60 27v39" />
              <path d="M30 34h18M30 42h14M72 34h18M72 42h12" />
            </svg>
            <p className="display m-0 text-[28px] leading-tight">Belum ada buku yang cocok.</p>
            <p className="m-0 text-[15px] text-ink-3">Coba kata lain, atau tampilkan semua kategori.</p>
            <button
              type="button"
              className={cn(ui.btn, ui.ghost)}
              onClick={() => refilter({ query: "", category: "Semua" })}
            >
              Tampilkan semua buku
            </button>
          </div>
        )}
      </section>
    </>
  );
}

/** Kemiringan dan ketinggian tiap huruf "ramai": berdesakan, tidak ada dua yang sejajar. */
const JOSTLE = [
  { r: -9, y: 0.04 },
  { r: 7, y: -0.08 },
  { r: -5, y: 0.06 },
  { r: 10, y: -0.04 },
  { r: -7, y: 0.02 },
];

/** Kata yang hurufnya berdesakan dan berlompatan masuk. Pembaca layar mendengar katanya utuh. */
function BusyWord({ word }: { word: string }) {
  return (
    <span className="hero-busy text-accent-600">
      <span className="sr-only">{word}</span>
      {[...word].map((ch, i) => {
        const j = JOSTLE[i % JOSTLE.length];
        return (
          <span
            key={i}
            data-letter
            aria-hidden="true"
            style={{ transform: `translateY(${j.y}em) rotate(${j.r}deg)`, animationDelay: `${0.35 + i * 0.07}s` }}
          >
            {ch}
          </span>
        );
      })}
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M4 12 L9 4 M10 15 L18 9 M3 4.5 L5.5 1"
          stroke="var(--color-accent-400)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Buku yang terbang seperti burung, mengepakkan halamannya. */
function Bird({
  left,
  top,
  width,
  height,
  delay,
  flap,
}: {
  left: string;
  top: string;
  width: number;
  height: number;
  delay?: string;
  flap?: string;
}) {
  return (
    <div className="bird" aria-hidden="true" style={{ left, top, width, height, animationDelay: delay }}>
      <span className="wing wing-l" style={{ animationDuration: flap }} />
      <span className="wing wing-r" style={{ animationDuration: flap }} />
    </div>
  );
}
