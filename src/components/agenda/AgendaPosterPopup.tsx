"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Cross } from "@/components/icons";
import { ui } from "@/components/ui";
import { AGENDA } from "@/lib/agenda";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/dates";
import type { AgendaEventView } from "@/lib/server/agenda";

/**
 * Poster agenda terdekat, muncul sekali di beranda: saat pertama membuka beranda di tab ini, dan sekali lagi setelah
 * masuk (kuncinya per akun). Poster dan tombolnya membawa ke jadwal itu di halaman Agenda.
 */
export function AgendaPosterPopup({ event: e, viewerKey }: { event: AgendaEventView; viewerKey: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const info = AGENDA[e.kind];
  const href = `/agenda#jadwal-${e.id}`;
  const when = `${formatDay(Date.parse(e.date))}, ${e.start}–${e.end} WIB`;

  useEffect(() => {
    const key = `lembar:poster-agenda:${viewerKey}:${e.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // Penyimpanan diblokir (mode privat): tetap tampilkan di kunjungan ini.
    }
    // Beri halaman waktu tampil dulu supaya popup tidak terasa menghadang. Tanda "sudah dilihat" baru ditulis saat
    // popup benar-benar terbuka: efek yang dibatalkan (pindah halaman cepat, Strict Mode) tidak boleh menghanguskannya.
    const t = setTimeout(() => {
      const d = dialog.current;
      if (!d || d.open) return;
      d.showModal();
      try {
        sessionStorage.setItem(key, "1");
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [e.id, viewerKey]);

  const close = () => dialog.current?.close();

  if (!e.poster) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="poster-agenda-h"
      onClick={(ev) => ev.target === ev.currentTarget && close()}
      className="m-auto max-h-[92dvh] w-[min(440px,calc(100vw-32px))] max-w-none animate-pop overflow-hidden rounded-[26px] border border-line bg-paper p-0 text-ink shadow-[0_40px_80px_-30px_rgba(29,43,40,.6)] backdrop:bg-[rgb(18_26_24/0.6)]"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <span className={ui.eyebrow}>Agenda terdekat</span>
          <button
            type="button"
            onClick={close}
            autoFocus
            aria-label="Tutup poster"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <Cross size={22} />
          </button>
        </div>
        <Link
          href={href}
          onClick={close}
          aria-label={`Lihat ${info.name} di halaman Agenda`}
          className="mx-5 block min-h-0 overflow-hidden rounded-[16px] border border-line bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- berkas unggahan dari /berkas, sudah diperkecil di server */}
          <img
            src={e.poster.src}
            alt={`Poster ${info.name}`}
            width={e.poster.width}
            height={e.poster.height}
            className="mx-auto block h-auto max-h-[56dvh] w-auto max-w-full object-contain"
          />
        </Link>
        <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
          <div className="flex flex-col gap-1">
            <h2 id="poster-agenda-h" className="m-0 text-xl leading-snug font-bold">
              {info.name}
            </h2>
            <p className="m-0 text-sm text-ink-3">
              {when} · {e.place}
            </p>
          </div>
          <Link href={href} onClick={close} className={cn(ui.btn, ui.primary)}>
            Lihat agenda
            <ArrowRight />
          </Link>
        </div>
      </div>
    </dialog>
  );
}
