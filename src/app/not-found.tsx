import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { MissingPage } from "@/components/illustrations/MissingPage";
import { PageShell } from "@/components/layout/PageShell";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Halaman tidak ditemukan", robots: { index: false } };

export default function NotFound() {
  return (
    <PageShell>
      <div
        className={cn(
          ui.wrap,
          "grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-center gap-x-14 gap-y-8 pt-14 pb-10",
        )}
      >
        <div className="flex animate-fade-up flex-col gap-5">
          <p className="m-0 font-mono text-sm text-accent-700">404 · halaman tidak ditemukan</p>
          <h1 className="display m-0 text-[clamp(38px,5vw,62px)] leading-[1.05]">Halaman ini tidak ada di rak mana pun.</h1>
          <p className="m-0 max-w-[46ch] text-lg leading-relaxed text-ink-3">
            Alamatnya mungkin salah ketik, atau bukunya sudah dipindah ke rak lain. Coba cari dari katalog, atau buka
            jadwal pinjamanmu.
          </p>
          <div className="mt-1 flex flex-wrap gap-2.5">
            <Link href="/" className={cn(ui.btn, ui.primary)}>
              Kembali ke katalog
              <ArrowRight />
            </Link>
            <Link href="/jadwal" className={cn(ui.btn, ui.ghost)}>
              Jadwal saya
            </Link>
          </div>
        </div>
        <MissingPage className="block h-auto w-full max-w-[520px] animate-fade-up justify-self-center [animation-delay:.15s]" />
      </div>
    </PageShell>
  );
}
