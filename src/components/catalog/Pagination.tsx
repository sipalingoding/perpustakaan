import { ChevronLeft, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/cn";

const item =
  "inline-flex cursor-pointer items-center justify-center rounded-full border-[1.5px] border-transparent bg-transparent font-semibold text-ink-2 tabular-nums transition-colors hover:border-primary-400 hover:bg-tint disabled:cursor-default disabled:opacity-35 disabled:hover:border-transparent disabled:hover:bg-transparent";

/** Nomor halaman yang ditampilkan: pertama, terakhir, dan tetangga halaman aktif; celahnya jadi "…". */
function pageList(current: number, total: number): Array<number | "…"> {
  const keep = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  // Celah satu halaman lebih baik ditampilkan nomornya daripada "…".
  if (keep.has(3) && !keep.has(2)) keep.add(2);
  if (keep.has(total - 2) && !keep.has(total - 1)) keep.add(total - 1);
  const sorted = [...keep].sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** Navigasi halaman (katalog, tabel admin): sebelumnya, nomor halaman, berikutnya. */
export function Pagination({
  page,
  total,
  onChange,
  className,
  label = "Halaman katalog",
  align = "center",
  size = "md",
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
  /** Nama navigasi untuk pembaca layar. */
  label?: string;
  align?: "center" | "end";
  /** "sm" untuk tabel admin: tombol 36 px, lebih ringkas dari katalog (44 px). */
  size?: "md" | "sm";
}) {
  if (total <= 1) return null;
  const justify = align === "end" ? "justify-end" : "justify-center";
  const box = size === "sm" ? "size-9 text-[13px]" : "size-11 text-sm";
  const icon = size === "sm" ? 18 : 22;
  return (
    <nav aria-label={label} className={cn("flex", justify, className)}>
      <ul className={cn("m-0 flex list-none flex-wrap items-center gap-1 p-0", justify)}>
        <li>
          <button
            type="button"
            className={cn(item, box)}
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={icon} />
          </button>
        </li>
        {pageList(page, total).map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="inline-flex w-5 justify-center text-[13px] text-muted">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={cn(
                  item,
                  box,
                  "aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-cream aria-[current=page]:hover:bg-ink",
                )}
                onClick={() => onChange(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Halaman ${p}`}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={cn(item, box)}
            onClick={() => onChange(page + 1)}
            disabled={page === total}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={icon} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
