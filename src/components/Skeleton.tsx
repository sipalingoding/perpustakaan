import type { CSSProperties, ReactNode } from "react";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Satu balok kerangka. Hanya hiasan: pembaca layar mendengar teks di SkeletonRegion. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  // cn hanya menyambung kelas, jadi radius bawaan dipasang hanya bila pemanggil tidak menentukan sendiri.
  const radius = className?.includes("rounded") ? "" : "rounded-xl";
  return <div aria-hidden="true" style={style} className={cn("animate-pulse bg-primary-200", radius, className)} />;
}

/** Pembungkus kerangka halaman. Teksnya hanya untuk pembaca layar, tidak tampil di layar. */
export function SkeletonRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={cn(ui.wrap, className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

const HERO_LINES = ["w-[88%]", "w-[96%]", "w-[70%]"];

function HeroSkeleton({ eyebrow = false }: { eyebrow?: boolean }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-x-14 gap-y-8 pt-14 pb-9">
      <div className="flex flex-col gap-4">
        {eyebrow && <Skeleton className="h-3 w-28" />}
        {HERO_LINES.map((w, i) => (
          <Skeleton key={i} className={cn("h-[clamp(36px,5vw,64px)]", w)} />
        ))}
        <Skeleton className="mt-2 h-5 w-[78%]" />
        <Skeleton className="h-[52px] w-full max-w-[540px] rounded-full" />
      </div>
      <Skeleton className="aspect-[640/440] w-full rounded-[28px]" />
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <SkeletonRegion label="Memuat katalog">
      <HeroSkeleton />
      <div className="flex flex-col gap-[22px] pt-[72px]">
        <div className="flex items-baseline justify-between gap-4">
          <Skeleton className="h-12 w-56" />
          <Skeleton className="h-11 w-52 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[72, 64, 64, 80, 64, 64].map((w, i) => (
            <Skeleton key={i} className="h-11 rounded-full" style={{ width: w }} />
          ))}
        </div>
        <div className="mt-[18px] grid grid-cols-2 gap-x-5 gap-y-9 min-[561px]:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] min-[561px]:gap-x-9 min-[561px]:gap-y-[52px]">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3.5">
              <Skeleton className="aspect-[3/4] w-full rounded-[10px]" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-[80%]" />
              <Skeleton className="h-4 w-[50%]" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function ProfileSkeleton() {
  return (
    <SkeletonRegion label="Memuat profil" className="pt-8">
      <Skeleton className="h-[clamp(300px,34vw,420px)] w-full rounded-[36px]" />
      <div className="mt-8 flex flex-wrap gap-6">
        <Skeleton className="h-[340px] min-w-0 flex-[1_1_420px] rounded-[26px]" />
        <Skeleton className="h-[340px] min-w-0 flex-[1_1_420px] rounded-[26px]" />
      </div>
      <Skeleton className="mt-16 h-11 w-64" />
      <Skeleton className="mt-5 h-[320px] w-full rounded-[28px]" />
    </SkeletonRegion>
  );
}

export function MembersSkeleton() {
  return (
    <SkeletonRegion label="Memuat papan baca">
      <HeroSkeleton />
      <Skeleton className="h-[110px] w-full rounded-[26px]" />
      <div className="mt-6 flex flex-col gap-3 rounded-[26px] border border-line bg-paper p-[22px]">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="ml-auto h-5 w-[40%]" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function DonateSkeleton() {
  return (
    <SkeletonRegion label="Memuat formulir sumbangan">
      <HeroSkeleton eyebrow />
      <div className="flex flex-wrap gap-6">
        <Skeleton className="h-[560px] min-w-0 flex-[999_1_520px] rounded-[26px]" />
        <Skeleton className="h-[420px] min-w-0 flex-[1_1_320px] rounded-[26px]" />
      </div>
    </SkeletonRegion>
  );
}

export function BookSkeleton() {
  return (
    <SkeletonRegion label="Memuat buku" className="pb-8">
      <Skeleton className="mt-[22px] mb-5 h-5 w-64" />
      <div className="flex flex-wrap items-start gap-x-12 gap-y-10">
        <Skeleton className="aspect-[4/3] min-w-0 flex-[999_1_560px] rounded-[26px]" />
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[22px]">
          <div className="flex gap-2">
            <Skeleton className="h-[30px] w-16 rounded-full" />
            <Skeleton className="h-[30px] w-20 rounded-full" />
          </div>
          <Skeleton className="h-14 w-[85%]" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[120px] w-full rounded-[18px]" />
          <Skeleton className="h-[320px] w-full rounded-[26px]" />
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function ScheduleSkeleton() {
  return (
    <SkeletonRegion label="Memuat jadwal" className="pt-11">
      <div className="flex flex-wrap items-end justify-between gap-6 pb-[34px]">
        <div className="flex w-full max-w-[680px] flex-col gap-3.5">
          <Skeleton className="h-[clamp(44px,5.5vw,72px)] w-[80%]" />
          <Skeleton className="h-5 w-[70%]" />
          <div className="flex gap-2.5">
            <Skeleton className="h-11 w-40 rounded-full" />
            <Skeleton className="h-11 w-40 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-[188px] w-[150px] rounded-[28px]" />
      </div>
      <div className="flex flex-wrap items-start gap-7">
        <Skeleton className="h-[640px] min-w-0 flex-[999_1_600px] rounded-3xl" />
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          <Skeleton className="h-[360px] w-full rounded-[26px]" />
          <Skeleton className="h-[88px] w-full rounded-[26px]" />
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function BorrowSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5 rounded-[26px] border border-line bg-cream p-[26px]">
      <span className="sr-only">Memuat panel peminjaman</span>
      <Skeleton className="h-8 w-56" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[62px] w-[62px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[92px] w-full rounded-[18px]" />
      <Skeleton className="h-[50px] w-full rounded-full" />
    </div>
  );
}

export function AgendaSkeleton() {
  return (
    <SkeletonRegion label="Memuat agenda">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-x-14 gap-y-10 pt-14 pb-6">
        <div className="flex flex-col gap-4">
          {HERO_LINES.slice(0, 2).map((w, i) => (
            <Skeleton key={i} className={cn("h-[clamp(36px,5vw,64px)]", w)} />
          ))}
          <Skeleton className="mt-2 h-5 w-[86%]" />
          <Skeleton className="h-5 w-[64%]" />
          <div className="flex flex-wrap gap-2">
            {[150, 110, 70, 80].map((w, i) => (
              <Skeleton key={i} className="h-11 rounded-full" style={{ width: w }} />
            ))}
          </div>
        </div>
        <Skeleton className="h-[260px] w-full rounded-[26px]" />
      </div>
      <div className="grid grid-cols-1 gap-x-14 gap-y-8 pt-20 lg:grid-cols-[5fr_6fr]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-[60%]" />
          <Skeleton className="h-5 w-[90%]" />
          <Skeleton className="h-5 w-[80%]" />
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-[22px]" />
      </div>
    </SkeletonRegion>
  );
}

export function AdminSkeleton() {
  return (
    <SkeletonRegion label="Memuat koleksi" className="pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-56" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-[50px] w-40 rounded-full" />
      </div>
      <Skeleton className="mt-8 h-[50px] w-full max-w-md rounded-[14px]" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-[60px] w-10 rounded-[3px_8px_8px_3px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-[40%]" />
              <Skeleton className="h-3.5 w-[24%]" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function BookFormSkeleton() {
  return (
    <SkeletonRegion label="Memuat formulir buku" className="pt-10">
      <Skeleton className="h-14 w-72 max-w-full" />
      <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[50px] w-full rounded-[14px]" />
          ))}
        </div>
        <Skeleton className="aspect-[3/4] w-full max-w-[300px] rounded-[10px]" />
      </div>
    </SkeletonRegion>
  );
}
