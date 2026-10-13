"use client";

import { useState } from "react";
import { Avatar, type AvatarLook } from "@/components/Avatar";
import { cn } from "@/lib/cn";

const BARS = [3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2];
const face =
  "absolute inset-0 flex flex-col justify-between gap-3 overflow-hidden rounded-[22px] px-6 py-[22px] backface-hidden shadow-[0_30px_40px_-28px_rgba(29,43,40,.65)]";

/** Kartu anggota digital. Ketuk untuk membalik dan melihat kode peminjaman. */
export function MemberCard({
  name,
  look,
  memberNo,
  since,
  validUntil,
}: {
  name: string;
  look: AvatarLook;
  memberNo: string;
  since: string;
  validUntil: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={flipped}
      aria-label={flipped ? "Kartu anggota, sisi kode. Ketuk untuk melihat sisi depan." : "Kartu anggota, sisi depan. Ketuk untuk melihat kode peminjaman."}
      onClick={() => setFlipped((f) => !f)}
      className="group relative block aspect-[1.586] w-full max-w-[440px] cursor-pointer border-0 bg-transparent p-0 text-left perspective-[1400px]"
    >
      <span
        className={cn(
          "absolute inset-0 block transition-transform duration-[900ms] ease-[cubic-bezier(.45,.05,.2,1)] transform-3d group-hover:rotate-x-4",
          flipped ? "rotate-y-180 group-hover:rotate-y-[172deg]" : "group-hover:-rotate-y-8",
        )}
      >
        <span className={cn(face, "bg-primary-700 text-[#F3EBDD]")}>
          <svg
            aria-hidden="true"
            viewBox="0 0 64 48"
            className="absolute -right-6 -bottom-[30px] h-[165px] w-[220px] opacity-[.12]"
            fill="none"
            stroke="#F3EBDD"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M32 14c-6-5-15-6-24-4v28c9-2 18-1 24 4 6-5 15-6 24-4V10c-9-2-18-1-24 4z" />
            <path d="M32 14v28" />
          </svg>
          <span className="flex items-center justify-between gap-3">
            <span className="display text-[26px] leading-none">Lembar</span>
            <span className="text-[10px] font-bold tracking-[0.26em] uppercase">Kartu anggota</span>
          </span>
          <span className="flex items-center gap-4">
            <span className="size-[76px] shrink-0 overflow-hidden rounded-full shadow-[0_0_0_3px_#F3EBDD]">
              <Avatar look={look} className="block size-full" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[19px] leading-tight font-bold">{name}</span>
              <span className="text-[13px] tracking-[0.08em]">No. {memberNo}</span>
            </span>
          </span>
          <span className="flex justify-between gap-3 text-xs">
            <span>
              Anggota sejak
              <strong className="block text-sm">{since}</strong>
            </span>
            <span className="text-right">
              Berlaku hingga
              <strong className="block text-sm">{validUntil}</strong>
            </span>
          </span>
        </span>

        <span className={cn(face, "rotate-y-180 bg-[#F3EBDD] text-ink")}>
          <span className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold tracking-[0.26em] text-ink-3 uppercase">Kode peminjaman</span>
            <span className="display text-[22px] leading-none">Lembar</span>
          </span>
          <span className="flex h-16 items-stretch rounded-[10px] bg-white px-2.5 py-2" aria-hidden="true">
            {BARS.map((w, i) => (
              <span key={i} className={cn("block shrink-0", i % 2 === 0 && "bg-ink")} style={{ width: w * 3 }} />
            ))}
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[15px] font-bold tracking-[0.18em]">{memberNo.replaceAll("-", " ")}</span>
            <span className="text-[13px] leading-normal text-ink-2">
              Tunjukkan kode ini di meja sirkulasi saat meminjam atau mengambil buku.
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
