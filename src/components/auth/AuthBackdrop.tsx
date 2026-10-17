import Link from "next/link";
import type { ReactNode } from "react";
import { AuthHills } from "@/components/illustrations/AuthHills";
import { LogoMark } from "@/components/layout/LogoMark";
import { ui } from "@/components/ui";

function DriftLeaf({
  className,
  fill,
  vein,
  delay,
}: {
  className: string;
  fill: string;
  vein: string;
  delay?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 24"
      aria-hidden="true"
      className={`drift absolute ${className}`}
      style={delay ? { animationDelay: delay } : undefined}
    >
      <path d="M2 12C10 2 28 2 38 12 28 22 10 22 2 12z" fill={fill} />
      <path d="M4 12h32" stroke={vein} strokeWidth="1.4" />
    </svg>
  );
}

/**
 * Latar halaman Masuk dan Lupa kata sandi: bukit, daun yang melayang, dan header kecil.
 * `catalogLink` dimatikan di halaman Masuk karena tautan katalognya sudah ada di dalam kartu.
 */
export function AuthBackdrop({ children, catalogLink = true }: { children: ReactNode; catalogLink?: boolean }) {
  return (
    // Satu layar penuh: header ringkas dan buku di tengah sisa tinggi, supaya formulir tidak perlu digulir.
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ground-2">
      <div
        aria-hidden="true"
        className="absolute -top-[200px] -right-[140px] size-[560px] rounded-full bg-primary-100"
      />
      <div aria-hidden="true" className="absolute top-[140px] -left-[110px] size-[280px] rounded-full bg-[#E0E8E1]" />
      <DriftLeaf className="top-[26%] left-[5%] h-[26px] w-11" fill="#A9BFB0" vein="#8FA89A" />
      <DriftLeaf className="top-[64%] right-[5%] h-[23px] w-[38px]" fill="#C3D3C6" vein="#A9BFB0" delay="-3s" />
      <DriftLeaf className="top-[12%] right-[32%] h-[18px] w-[30px]" fill="#B7C9BC" vein="#9AB1A2" delay="-6s" />
      <AuthHills className="absolute bottom-0 left-0 block h-[min(240px,26dvh)] w-full" />

      <header className="relative z-[2] flex items-center justify-between gap-3 px-[clamp(16px,4vw,48px)] py-2">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 text-ink no-underline hover:text-ink">
          <LogoMark gap="#E6ECE4" />
          <span className="display text-[28px] leading-none">Lembar</span>
        </Link>
        {catalogLink && (
          <Link href="/" className={ui.navlink}>
            Lihat katalog<span className="hidden sm:inline">&nbsp;tanpa masuk</span>
          </Link>
        )}
      </header>

      <main className="relative z-[1] flex flex-1 flex-col items-center justify-center px-4 pt-1 pb-4">{children}</main>
    </div>
  );
}
