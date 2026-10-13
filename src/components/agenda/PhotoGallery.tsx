"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Cross } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { AgendaPhoto } from "@/lib/server/agenda";

const SHOWN = 5;

/** Letak petak per jumlah foto pada kisi 4 x 2: foto pertama selalu paling besar. */
const SPANS: Record<number, string[]> = {
  1: ["col-span-4 row-span-2"],
  2: ["col-span-2 row-span-2", "col-span-2 row-span-2"],
  3: ["col-span-2 row-span-2", "col-span-2", "col-span-2"],
  4: ["col-span-2 row-span-2", "col-span-2", "", ""],
  5: ["col-span-2 row-span-2", "", "", "", ""],
};

/** Mozaik dokumentasi kegiatan. Setiap foto bisa dibuka besar; panah kiri/kanan berpindah foto, Esc menutup. */
export function PhotoGallery({ photos, label }: { photos: AgendaPhoto[]; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(0);
  const tiles = photos.slice(0, SHOWN);
  const spans = SPANS[tiles.length];
  const extra = photos.length - tiles.length;

  const show = (i: number) => {
    setOpen(i);
    dialog.current?.showModal();
  };
  const step = (d: number) => setOpen((i) => (i + d + photos.length) % photos.length);
  const current = photos[open];

  return (
    <>
      <ul
        className="m-0 grid aspect-[4/3] list-none grid-cols-4 grid-rows-2 gap-2 p-0"
        aria-label={`Dokumentasi ${label}`}
      >
        {tiles.map((p, i) => {
          const more = i === tiles.length - 1 && extra > 0;
          return (
            <li key={p.id} className={cn("min-h-0 min-w-0", spans[i])}>
              <button
                type="button"
                onClick={() => show(i)}
                aria-label={
                  more
                    ? `Lihat semua ${photos.length} foto`
                    : `Perbesar foto ${i + 1}${p.caption ? `: ${p.caption}` : ""}`
                }
                className="group relative block size-full cursor-zoom-in overflow-hidden rounded-[16px] border-0 bg-tint p-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- foto dari rute berkas sendiri */}
                <img
                  src={p.src}
                  alt=""
                  loading="lazy"
                  width={p.width}
                  height={p.height}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {more && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-lg font-bold text-cream">
                    +{extra} foto
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`Foto ${label}`}
        onKeyDown={(e) => {
          if (photos.length < 2) return;
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto max-h-[calc(100vh-32px)] w-[min(1100px,calc(100vw-32px))] max-w-none overflow-visible border-0 bg-transparent p-0 backdrop:bg-[rgb(18_26_24/0.88)]"
      >
        {current && (
          <figure className="m-0 flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto dari rute berkas sendiri */}
            <img
              src={current.src}
              alt={current.caption || `Dokumentasi ${label}, foto ${open + 1}`}
              width={current.width}
              height={current.height}
              className="mx-auto block max-h-[calc(100vh-150px)] w-auto max-w-full rounded-[16px] object-contain"
            />
            <figcaption className="flex flex-wrap items-center justify-between gap-3 text-cream">
              <span className="text-[15px]">
                {current.caption || label}
                <span className="ml-2 text-sm opacity-75">
                  {open + 1} / {photos.length}
                </span>
              </span>
              <span className="flex gap-2">
                {photos.length > 1 && (
                  <>
                    <LightboxButton label="Foto sebelumnya" onClick={() => step(-1)}>
                      <ChevronLeft size={22} />
                    </LightboxButton>
                    <LightboxButton label="Foto berikutnya" onClick={() => step(1)}>
                      <ChevronRight size={22} />
                    </LightboxButton>
                  </>
                )}
                <LightboxButton label="Tutup" onClick={() => dialog.current?.close()}>
                  <Cross size={22} />
                </LightboxButton>
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}

function LightboxButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-cream/15 text-cream transition-colors hover:bg-cream/30"
    >
      {children}
    </button>
  );
}
