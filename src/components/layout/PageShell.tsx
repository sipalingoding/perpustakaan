import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader, type NavKey } from "@/components/layout/SiteHeader";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LIBRARY } from "@/lib/library";

/** Kerangka halaman anggota: navigasi, isi, dan kaki halaman. */
export function PageShell({ active, children }: { active?: NavKey; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip pb-[calc(64px+env(safe-area-inset-bottom,0px))] min-[821px]:pb-0">
      <SiteHeader active={active} />
      <main className="flex-1">{children}</main>
      <footer className="mt-24 border-t border-line">
        <div
          className={cn(ui.wrap, "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-7 pb-9 text-sm text-ink-3")}
        >
          <span>
            <span className="display text-[22px] text-ink">Lembar</span>, perpustakaan yang tenang.
          </span>
          <address className="flex max-w-[46ch] flex-col gap-0.5 not-italic sm:text-right">
            <span>
              Jam layanan: <strong className="font-semibold text-ink-2">{LIBRARY.days}, {LIBRARY.hours}</strong>
            </span>
            <span>{LIBRARY.address}</span>
          </address>
          <nav aria-label="Informasi" className="flex basis-full gap-5">
            <Link href="/kebijakan-privasi" className="text-ink-3">
              Kebijakan privasi
            </Link>
            <Link href="/hapus-akun" className="text-ink-3">
              Hapus akun
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
