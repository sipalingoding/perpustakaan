"use client";

import { ArrowRight, Clock, MapPin } from "@/components/icons";
import { LibraryFront } from "@/components/illustrations/LibraryFront";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatHour, LIBRARY, openState, type OpenState } from "@/lib/library";
import type { LibraryStatus } from "@/lib/server/library-status";
import { useNow } from "@/lib/use-now";

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(LIBRARY.address)}`;
/** Peta tersemat Google Maps (tanpa kunci API). */
const MAPS_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(LIBRARY.address)}&z=15&hl=id&output=embed`;

/**
 * Jam layanan, alamat, dan status buka/tutup perpustakaan, di bawah katalog. Status dihitung dari jam Jakarta
 * (diperbarui tiap menit) dan penutupan manual pustakawan; di luar jam layanan ilustrasinya berganti malam.
 * Tanpa `status` (saat dimuat), kartu tampil tanpa lencana status.
 */
export function VisitInfo({ status, now: initialNow = 0 }: { status?: LibraryStatus; now?: number }) {
  const now = useNow(initialNow);
  const state = status ? openState(now, status.closed) : null;
  return (
    <section aria-labelledby="kunjungi-h" className={cn(ui.wrap, "pt-20")}>
      <div className="grid items-center gap-x-12 gap-y-6 overflow-hidden rounded-[26px] border border-line bg-paper p-6 min-[480px]:p-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:p-10">
        <LibraryFront
          className="mx-auto block h-auto w-full max-w-[400px]"
          night={state?.afterHours ?? false}
          open={state?.open ?? true}
        />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={ui.eyebrow}>Kunjungi kami</span>
              {state && status && <StatusBadge state={state} note={status.note} />}
            </div>
            <h2 id="kunjungi-h" className="display m-0 text-4xl leading-tight">
              Mampir ke perpustakaan.
            </h2>
          </div>
          <dl className="m-0 flex flex-col gap-4">
            <div className="flex items-start gap-3.5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <Clock size={22} />
              </span>
              <div className="flex flex-col gap-0.5 pt-0.5">
                <dt className="text-sm font-semibold text-muted">Jam layanan</dt>
                <dd className="m-0 text-lg font-bold text-ink tabular-nums">
                  <span className="block text-[15px] font-semibold text-ink-2">{LIBRARY.days}</span>
                  {LIBRARY.hours} WIB
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                <MapPin size={22} />
              </span>
              <div className="flex flex-col gap-0.5 pt-0.5">
                <dt className="text-sm font-semibold text-muted">Lokasi</dt>
                <dd className="m-0 max-w-[44ch] text-[15px] leading-relaxed text-ink-2 not-italic">{LIBRARY.address}</dd>
              </div>
            </div>
          </dl>
          <div className="overflow-hidden rounded-[18px] border border-line bg-tint">
            <iframe
              src={MAPS_EMBED}
              title={`Peta lokasi perpustakaan: ${LIBRARY.address}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block aspect-[16/9] w-full border-0"
            />
          </div>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={cn(ui.btn, ui.ghost, "self-start")}>
            Buka di Google Maps
            <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}

/** Lencana "Buka sekarang" / "Tutup" beserta kapan berubah. Diumumkan pembaca layar saat berganti. */
function StatusBadge({ state, note }: { state: OpenState; note: string }) {
  const detail = state.open
    ? `tutup pukul ${formatHour(LIBRARY.closeHour)}`
    : state.manual
      ? note || "ditutup sementara oleh pustakawan"
      : state.beforeOpen
        ? `buka hari ini pukul ${formatHour(LIBRARY.openHour)}`
        : `buka lagi besok pukul ${formatHour(LIBRARY.openHour)}`;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold",
        state.open ? "bg-primary-100 text-primary-700" : "bg-accent-100 text-accent-700",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", state.open ? "animate-pulse bg-primary-500" : "bg-accent-600")}
      />
      <span>
        <strong className="font-bold">{state.open ? "Buka sekarang" : "Tutup"}</strong> · {detail}
      </span>
    </span>
  );
}
