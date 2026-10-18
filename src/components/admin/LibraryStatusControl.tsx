"use client";

import { useState, useTransition } from "react";
import { setLibraryClosed } from "@/app/admin/actions";
import { Spinner } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LIBRARY, openState } from "@/lib/library";
import type { LibraryStatus } from "@/lib/server/library-status";
import { useNow } from "@/lib/use-now";

/** Pustakawan menutup perpustakaan secara manual (mis. libur), atau membukanya lagi. */
export function LibraryStatusControl({ status, now: initialNow }: { status: LibraryStatus; now: number }) {
  const [closed, setClosed] = useState(status.closed);
  const [note, setNote] = useState(status.note);
  const [busy, startTransition] = useTransition();
  const notify = useToast();
  const now = useNow(initialNow);
  const state = openState(now, closed);

  const save = (next: boolean) =>
    startTransition(async () => {
      const result = await setLibraryClosed(next, next ? note : "").catch(() => ({
        ok: false as const,
        error: "Status perpustakaan gagal disimpan. Periksa koneksi lalu coba lagi.",
      }));
      if (!result.ok) {
        notify({ kind: "error", text: result.error });
        return;
      }
      setClosed(next);
      if (!next) setNote("");
      notify({
        kind: "ok",
        text: next
          ? "Perpustakaan ditutup. Katalog menampilkan status Tutup sampai kamu membukanya lagi."
          : state.afterHours
            ? "Penutupan manual dicabut. Status kembali mengikuti jam layanan (sekarang di luar jam, jadi tetap Tutup)."
            : "Perpustakaan dibuka lagi. Katalog menampilkan status Buka.",
      });
    });

  return (
    <section aria-labelledby="status-layanan-h" className={cn(ui.wrap, "pt-4")}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[22px] border border-line bg-paper px-5 py-4">
        <div className="flex min-w-0 flex-1 basis-[260px] items-center gap-3">
          <span
            aria-hidden="true"
            className={cn("size-3 shrink-0 rounded-full", state.open ? "bg-primary-500" : "bg-accent-600")}
          />
          <div className="flex min-w-0 flex-col">
            <h2 id="status-layanan-h" className="m-0 text-[15px] font-bold">
              {state.open ? "Perpustakaan sedang buka" : closed ? "Ditutup manual" : "Tutup, di luar jam layanan"}
            </h2>
            <p className="m-0 text-[13px] text-ink-3">
              {closed
                ? `Anggota melihat status Tutup${note ? `: “${note}”` : ""}. Klik Buka lagi bila layanan sudah berjalan.`
                : `Otomatis mengikuti jam layanan (${LIBRARY.days}, ${LIBRARY.hours} WIB).`}
            </p>
          </div>
        </div>
        {closed ? (
          <button type="button" onClick={() => save(false)} disabled={busy} className={cn(ui.btn, ui.primary)}>
            {busy && <Spinner />}
            Buka lagi
          </button>
        ) : (
          <div className="flex flex-1 basis-[320px] flex-wrap items-center justify-end gap-2.5">
            <label className="sr-only" htmlFor="status-note">
              Keterangan penutupan (opsional)
            </label>
            <input
              id="status-note"
              value={note}
              maxLength={120}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Keterangan, mis. Libur nasional (opsional)"
              className={cn(ui.field, "min-w-0 flex-1 basis-[200px]")}
            />
            <button
              type="button"
              onClick={() => save(true)}
              disabled={busy}
              className={cn(ui.btn, "border-0 bg-accent-700 text-cream hover:bg-accent-700 hover:text-cream")}
            >
              {busy && <Spinner />}
              Tutup perpustakaan
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
