import Link from "next/link";
import { Suspense } from "react";
import { AuthProblemBar } from "@/components/layout/AuthProblemBar";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { LogoMark } from "@/components/layout/LogoMark";
import { MobileNav } from "@/components/layout/MobileNav";
import { Skeleton } from "@/components/Skeleton";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";

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
    <header className="border-b border-line">
      <div className={cn(ui.wrap, "flex items-center gap-x-7 gap-y-3 py-3.5")}>
        <MobileNav items={NAV} active={active} />
        <Link href="/" className="flex min-h-11 items-center gap-2.5 text-ink no-underline hover:text-ink">
          <LogoMark />
          <span className="display text-[28px] leading-none">Lembar</span>
        </Link>
        <nav aria-label="Navigasi utama" className="hidden flex-wrap gap-1 min-[821px]:flex">
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
        <div className="ml-auto flex items-center gap-2">
          {/* Siapa yang masuk baru diketahui saat permintaan, jadi bagian ini dimuat terpisah dari kerangka halaman. */}
          <Suspense fallback={<HeaderSkeleton />}>
            <HeaderActions active={active} />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={null}>
        <AuthProblemBar />
      </Suspense>
    </header>
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
