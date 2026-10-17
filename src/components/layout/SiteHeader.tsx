import Link from "next/link";
import { Suspense } from "react";
import { AuthProblemBar } from "@/components/layout/AuthProblemBar";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { LogoMark } from "@/components/layout/LogoMark";
import { MobileNav } from "@/components/layout/MobileNav";
import { Skeleton } from "@/components/Skeleton";
import { ui } from "@/components/ui";

export type NavKey = "katalog" | "jadwal" | "agenda" | "anggota" | "sumbang" | "profil";

const NAV: Array<{ key: NavKey; href: string; label: string }> = [
  { key: "katalog", href: "/", label: "Katalog" },
  { key: "jadwal", href: "/jadwal", label: "Jadwal saya" },
  { key: "agenda", href: "/agenda", label: "Agenda" },
  { key: "anggota", href: "/anggota", label: "Anggota" },
  { key: "sumbang", href: "/sumbang", label: "Sumbang buku" },
];

export function SiteHeader({ active }: { active?: NavKey }) {
  return (
    <>
      {/* Header melayang: kapsul membulat yang tetap di atas saat digulir; area di sekitarnya tembus pandang. */}
      <header className="sticky top-0 z-40 pt-3 min-[821px]:pt-4">
        <div className={ui.wrap}>
          <div className="flex items-center gap-x-4 rounded-full border border-line bg-cream/85 py-2 pr-3 pl-4 shadow-[0_18px_40px_-26px_rgba(29,43,40,.55)] backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-cream min-[821px]:pr-4 min-[821px]:pl-6">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 text-ink no-underline hover:text-ink">
              <LogoMark gap="#F8F7F1" />
              <span className="display text-[28px] leading-none">Lembar</span>
            </Link>
            <nav aria-label="Navigasi utama" className="hidden flex-1 flex-wrap justify-center gap-1 min-[821px]:flex">
              {NAV.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={ui.navlink}
                  aria-current={active === item.key ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 min-[821px]:ml-0">
              {/* Siapa yang masuk baru diketahui saat permintaan, jadi bagian ini dimuat terpisah dari kerangka halaman. */}
              <Suspense fallback={<HeaderSkeleton />}>
                <HeaderActions active={active} />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={null}>
            <AuthProblemBar />
          </Suspense>
        </div>
      </header>
      {/* Di luar kapsul: backdrop-filter pada kapsul akan mengurung posisi fixed bilah tab. */}
      <MobileNav items={NAV} active={active} />
    </>
  );
}

function HeaderSkeleton() {
  return (
    <>
      <Skeleton className="size-11 rounded-full" />
      <Skeleton className="size-11 rounded-full" />
    </>
  );
}
