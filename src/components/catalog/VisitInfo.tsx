import { ArrowRight, Clock, MapPin } from "@/components/icons";
import { LibraryFront } from "@/components/illustrations/LibraryFront";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LIBRARY } from "@/lib/library";

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(LIBRARY.address)}`;

/** Jam layanan dan alamat perpustakaan, di bawah katalog. */
export function VisitInfo() {
  return (
    <section aria-labelledby="kunjungi-h" className={cn(ui.wrap, "pt-20")}>
      <div className="grid items-center gap-x-12 gap-y-6 overflow-hidden rounded-[26px] border border-line bg-paper p-6 min-[480px]:p-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:p-10">
        <LibraryFront className="mx-auto block h-auto w-full max-w-[400px]" />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className={ui.eyebrow}>Kunjungi kami</span>
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
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={cn(ui.btn, ui.ghost, "self-start")}>
            Buka di Google Maps
            <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
