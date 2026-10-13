"use client";

import { useId, useState, type FormEvent } from "react";
import { Search, Spinner } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { SearchResponse, SourceBook } from "@/lib/server/book-sources";

export const SOURCE_NAME: Record<SourceBook["source"], string> = {
  openlibrary: "Open Library",
  google: "Google Books",
};

/** Pencarian buku di katalog publik (Open Library, dan Google Books bila ada kuncinya). Dipakai admin dan formulir sumbangan. */
export function SourceSearch({
  search,
  onPick,
  heading,
  description,
  className,
  initialVisible,
}: {
  /** Server Action pencarian; hak aksesnya diperiksa di server (admin: pustakawan, sumbangan: anggota). */
  search: (query: string) => Promise<SearchResponse>;
  onPick: (r: SourceBook) => void;
  heading: string;
  description: string;
  className?: string;
  /** Tampilkan sekian hasil dulu, sisanya lewat tombol; kosong = semua. */
  initialVisible?: number;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{
    results: SourceBook[];
    failed: string[];
    error?: string;
  } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const run = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await search(query);
      setState(r.ok ? { results: r.results, failed: r.failed } : { results: [], failed: [], error: r.error });
      setPicked(null);
      setShowAll(false);
    } catch {
      setState({
        results: [],
        failed: [],
        error: "Pencarian gagal. Periksa koneksi lalu coba lagi.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn("rounded-[26px] bg-primary-100 p-[clamp(18px,3vw,28px)]", className)} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="m-0 text-lg font-bold">
        {heading}
      </h2>
      <p className="mt-1 mb-0 text-sm text-ink-2">
        {description}
      </p>
      {/* Formulir sendiri, terpisah dari formulir induknya, jadi Enter di sini hanya mencari. */}
      <form onSubmit={run} role="search" className="mt-4 flex max-w-[640px] flex-wrap gap-2.5">
        <label htmlFor={`${id}-q`} className="sr-only">
          Judul, penulis, atau ISBN
        </label>
        <input
          id={`${id}-q`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Laskar Pelangi atau 9789793062792"
          className={cn(ui.field, "min-w-0 flex-[1_1_260px]")}
        />
        <button
          type="submit"
          className={cn(ui.btn, ui.primary)}
          disabled={busy || query.trim().length < 2}
          aria-busy={busy}
        >
          {busy ? <Spinner /> : <Search size={20} />}
          Cari
        </button>
      </form>

      <div aria-live="polite">
        {state?.error && <p className="mt-4 mb-0 text-sm font-semibold text-accent-700">{state.error}</p>}
        {state && !state.error && state.results.length === 0 && (
          <p className="mt-4 mb-0 text-sm text-ink-2">
            Tidak ada hasil. Coba kata lain atau ISBN-nya, atau isi formulir secara manual.
          </p>
        )}
        {state && state.failed.length > 0 && state.results.length > 0 && (
          <p className="mt-4 mb-0 text-[13px] text-ink-3">{state.failed.join(" dan ")} sedang tidak bisa dihubungi.</p>
        )}
      </div>

      {state && state.results.length > 0 && (
        <ul className="m-0 mt-4 grid list-none grid-cols-[repeat(auto-fill,minmax(min(250px,100%),1fr))] gap-2.5 p-0">
          {(showAll || !initialVisible ? state.results : state.results.slice(0, initialVisible)).map((r) => {
            const key = `${r.source}:${r.ref}`;
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={picked === key}
                  onClick={() => {
                    setPicked(key);
                    onPick(r);
                  }}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-[16px] border-[1.5px] border-transparent bg-paper p-2.5 text-left transition-colors hover:border-primary-400 aria-pressed:border-ink"
                >
                  {r.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pratinjau dari katalog publik, tidak disimpan
                    <img
                      src={r.thumb}
                      alt=""
                      loading="lazy"
                      className="h-[72px] w-12 shrink-0 rounded-[2px_6px_6px_2px] bg-line object-cover"
                    />
                  ) : (
                    <span className="flex h-[72px] w-12 shrink-0 items-center justify-center rounded-[2px_6px_6px_2px] border-[1.5px] border-dashed border-field text-center text-[10px] leading-tight font-semibold text-muted">
                      Tanpa sampul
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="line-clamp-2 text-sm leading-snug font-bold text-ink">{r.title}</span>
                    <span className="truncate text-[13px] text-ink-3">{r.author || "Penulis tidak diketahui"}</span>
                    <span className="text-xs text-muted">
                      {[r.year, r.pages && `${r.pages} hlm`, SOURCE_NAME[r.source]].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {state && initialVisible && !showAll && state.results.length > initialVisible && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full border-0 bg-transparent px-1 text-sm font-semibold text-primary-700 underline"
        >
          Tampilkan {state.results.length - initialVisible} hasil lagi
        </button>
      )}
    </section>
  );
}

