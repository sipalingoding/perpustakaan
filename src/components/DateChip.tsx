import { dayOfMonth, formatLong, weekdayShort } from "@/lib/dates";

/** Tombol tanggal: nama hari singkat di atas, tanggal di bawah. */
export function DateChip({ time, selected, onSelect }: { time: number; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={formatLong(time)}
      onClick={onSelect}
      className="flex min-h-[62px] min-w-[62px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] border-field bg-transparent px-2.5 py-2 text-ink transition hover:border-primary-400 hover:bg-tint aria-pressed:-translate-y-0.5 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-cream aria-pressed:hover:border-ink aria-pressed:hover:bg-ink"
    >
      <span className="text-xs font-semibold">{weekdayShort(time)}</span>
      <span className="text-[19px] leading-none font-extrabold">{dayOfMonth(time)}</span>
    </button>
  );
}
