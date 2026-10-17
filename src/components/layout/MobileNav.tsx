import Link from "next/link";
import type { ComponentType } from "react";
import { CalendarCheck, CalendarClock, Heart, People, Shelf } from "@/components/icons";
import type { NavKey } from "@/components/layout/SiteHeader";

/** Ikon dan label pendek tiap tab; label panjang ("Jadwal saya") tidak muat di lima kolom layar sempit. */
const TABS: Partial<Record<NavKey, { icon: ComponentType<{ size?: number }>; short: string }>> = {
  katalog: { icon: Shelf, short: "Katalog" },
  jadwal: { icon: CalendarCheck, short: "Jadwal" },
  agenda: { icon: CalendarClock, short: "Agenda" },
  anggota: { icon: People, short: "Anggota" },
  sumbang: { icon: Heart, short: "Sumbang" },
};

/**
 * Navigasi utama versi mobile: bilah tab di bawah layar seperti aplikasi ponsel.
 * Hanya tampil di bawah 821px; di layar lebih lebar, nav di header yang dipakai (lihat SiteHeader).
 */
export function MobileNav({
  items,
  active,
}: {
  items: ReadonlyArray<{ key: NavKey; href: string; label: string }>;
  active?: NavKey;
}) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/90 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-12px_30px_-24px_rgba(29,43,40,.5)] backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-cream min-[821px]:hidden"
    >
      <ul className="m-0 mx-auto grid max-w-[560px] list-none grid-cols-5 p-0 px-1">
        {items.map((entry) => {
          const tab = TABS[entry.key];
          const Icon = tab?.icon ?? Shelf;
          return (
            <li key={entry.key}>
              <Link
                href={entry.href}
                aria-current={active === entry.key ? "page" : undefined}
                aria-label={entry.label}
                className="group flex min-h-16 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] leading-none font-semibold text-muted no-underline hover:text-ink aria-[current=page]:text-ink"
              >
                <span className="inline-flex h-8 w-14 items-center justify-center rounded-full transition-colors group-hover:bg-hover group-aria-[current=page]:bg-ink group-aria-[current=page]:text-cream">
                  <Icon size={22} />
                </span>
                <span aria-hidden="true" className="group-aria-[current=page]:font-bold">
                  {tab?.short ?? entry.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
