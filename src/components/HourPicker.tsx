import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatHour, LIBRARY, VISIT_HOURS } from "@/lib/library";

/**
 * Pilihan jam kunjungan per jam sesuai jam layanan. Jam yang tidak tersedia (sudah lewat hari ini) tetap tampil
 * tapi nonaktif, supaya anggota tahu kenapa jam itu tidak bisa dipilih.
 */
export function HourPicker({
  label,
  available,
  value,
  onChange,
}: {
  label: string;
  /** Jam yang bisa dipilih untuk tanggal yang sedang dipilih. */
  available: number[];
  value: number;
  onChange: (hour: number) => void;
}) {
  const somePast = available.length < VISIT_HOURS.length;
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className={cn(ui.label, "mb-2.5 p-0")}>
        {label} · jam layanan {LIBRARY.hours}
      </legend>
      <div className="flex flex-wrap gap-2">
        {VISIT_HOURS.map((h) => {
          const open = available.includes(h);
          return (
            <button
              key={h}
              type="button"
              aria-pressed={value === h}
              disabled={!open}
              aria-label={open ? `Pukul ${formatHour(h)}` : `Pukul ${formatHour(h)}, sudah lewat`}
              onClick={() => onChange(h)}
              className={cn(
                ui.chip,
                "min-w-[76px] justify-center tabular-nums disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
              )}
            >
              {formatHour(h)}
            </button>
          );
        })}
      </div>
      {somePast && <p className="mt-2 mb-0 text-[13px] text-ink-3">Jam yang sudah lewat hari ini tidak bisa dipilih.</p>}
    </fieldset>
  );
}

/** Jam yang bisa dipilih untuk tanggal ke-i dari jadwal: hari ini (selalu urutan pertama) hanya jam yang belum lewat. */
export function hoursForDate(index: number, todayFirstHour: number | null) {
  return index === 0 && todayFirstHour !== null ? VISIT_HOURS.filter((h) => h >= todayFirstHour) : VISIT_HOURS;
}
