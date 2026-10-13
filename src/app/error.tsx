"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert, ArrowRight } from "@/components/icons";
import { ShelfMaintenance } from "@/components/illustrations/ShelfMaintenance";
import { LogoMark } from "@/components/layout/LogoMark";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LIBRARY } from "@/lib/library";

// Pesan bawaan Next.js saat galat server disembunyikan di produksi.
const REDACTED = /specific message is omitted in production|Minified React error/i;

/**
 * Halaman galat (500): rak sedang dirapikan. Pesan galat sebenarnya tetap terlihat, bukan hanya di konsol;
 * di produksi Next.js menyembunyikan isinya, jadi yang tampil kode galat (digest) untuk dilaporkan.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const hidden = !error.message || REDACTED.test(error.message);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className={cn(ui.wrap, "flex items-center py-3.5")}>
          <Link href="/" className="flex min-h-11 items-center gap-2.5 text-ink no-underline hover:text-ink">
            <LogoMark />
            <span className="display text-[28px] leading-none">Lembar</span>
          </Link>
        </div>
      </header>
      <main
        className={cn(
          ui.wrap,
          "grid flex-1 grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-center gap-x-14 gap-y-8 py-12",
        )}
      >
        <div className="flex animate-fade-up flex-col gap-5">
          <p className="m-0 font-mono text-sm text-accent-700">500 · sedang dalam perbaikan</p>
          <h1 className="display m-0 text-[clamp(38px,5vw,62px)] leading-[1.05]">Lembar sedang dirapikan.</h1>
          <p className="m-0 max-w-[46ch] text-lg leading-relaxed text-ink-3">
            Ada yang tidak beres di sisi kami, jadi rak ini belum bisa dibuka. Datamu aman. Coba lagi sebentar lagi.
          </p>
          <div
            role="alert"
            className="flex max-w-[60ch] items-start gap-2.5 rounded-[14px] bg-accent-100 px-4 py-3 text-sm leading-snug text-accent-700"
          >
            <Alert size={20} className="mt-px shrink-0" />
            <span className="flex min-w-0 flex-col gap-1">
              <strong className="font-semibold break-words">
                {hidden ? "Rincian galat disembunyikan server demi keamanan." : error.message}
              </strong>
              {error.digest && (
                <span className="font-mono text-[13px]">
                  Kode galat: {error.digest} (sebutkan kode ini bila melapor ke pustakawan)
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2.5">
            <button type="button" className={cn(ui.btn, ui.primary)} onClick={reset}>
              Coba lagi
            </button>
            <Link href="/" className={cn(ui.btn, ui.ghost)}>
              Ke katalog
              <ArrowRight />
            </Link>
          </div>
          <p className="m-0 text-sm text-ink-3">
            Butuh buku sekarang? Meja sirkulasi tetap buka pukul {LIBRARY.hours}.
          </p>
        </div>
        <ShelfMaintenance className="block h-auto w-full max-w-[500px] animate-fade-up justify-self-center [animation-delay:.15s]" />
      </main>
    </div>
  );
}
