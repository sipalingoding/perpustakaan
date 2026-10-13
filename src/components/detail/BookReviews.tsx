import { Avatar } from "@/components/Avatar";
import { formatRating, Stars } from "@/components/Stars";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatLong } from "@/lib/dates";
import type { ReviewSummary } from "@/lib/server/reviews";

/** Ulasan pembaca di halaman buku: rata-rata, sebaran bintang, lalu ulasan satu per satu. */
export function BookReviews({ summary, title }: { summary: ReviewSummary; title: string }) {
  const { avg, count, stars, reviews } = summary;
  const most = Math.max(...stars, 1);

  return (
    <section aria-labelledby="ulasan-h" className="scroll-mt-6 pt-4" id="ulasan">
      <h2 id="ulasan-h" className="display m-0 text-[clamp(30px,3.4vw,40px)] leading-none">
        Ulasan pembaca
      </h2>

      {count === 0 ? (
        <p className="mt-4 mb-0 max-w-[60ch] text-[15px] leading-relaxed text-ink-3">
          Belum ada ulasan untuk {title}. Pembaca yang meminjamnya bisa memberi rating dan ulasan saat mengembalikan
          buku dari halaman Jadwal saya.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <div className={cn(ui.card, "flex flex-wrap items-center gap-x-10 gap-y-5")}>
            <div className="flex items-end gap-3">
              <span className="display text-[56px] leading-none tabular-nums">{formatRating(avg)}</span>
              <div className="flex flex-col gap-1 pb-1.5">
                <Stars value={avg} size={20} />
                <span className="text-[13px] text-ink-3">{count} ulasan</span>
              </div>
            </div>
            <ul className="m-0 flex min-w-[220px] flex-1 list-none flex-col gap-1.5 p-0" aria-label="Sebaran bintang">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n} className="grid grid-cols-[3ch_1fr_3ch] items-center gap-2.5 text-[13px] text-ink-2">
                  <span className="tabular-nums">{n}★</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[#E1E6DF]" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-accent-600"
                      style={{ width: `${(stars[n - 1] / most) * 100}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums">
                    {stars[n - 1]}
                    <span className="sr-only"> ulasan {n} bintang</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ol className="m-0 flex list-none flex-col p-0">
            {reviews.map((r) => (
              <li key={r.id} className="border-t border-line py-5 first:border-t-0 first:pt-0">
                <article className="flex gap-4">
                  <span className="size-11 shrink-0 overflow-hidden rounded-full bg-tint">
                    <Avatar look={r.look} className="block size-full" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="m-0 text-[15px] font-bold">{r.name}</h3>
                      <Stars value={r.rating} size={16} />
                      <time dateTime={r.date} className="text-[13px] text-ink-3">
                        {formatLong(Date.parse(r.date))}
                      </time>
                    </div>
                    {r.body ? (
                      <p className="m-0 max-w-[68ch] text-[15px] leading-relaxed whitespace-pre-line text-ink-2">
                        {r.body}
                      </p>
                    ) : (
                      <p className="m-0 text-sm text-ink-3 italic">Memberi rating tanpa ulasan tertulis.</p>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
