"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Spinner, Trash } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Konfirmasi sebelum menghapus, tampil sebagai jendela di tengah layar. Esc, klik di luar jendela, atau "Batal"
 * menutupnya, kecuali saat penghapusan sedang berjalan. Fokus kembali ke tombol pemicunya setelah ditutup.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel = "Ya, hapus",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  /** Penjelasan akibatnya, mis. "Tidak bisa dibatalkan." Boleh berisi isian tambahan seperti pilihan tujuan. */
  children?: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  const cancel = () => !busy && onCancel();

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-h`}
      aria-describedby={children ? `${id}-d` : undefined}
      onCancel={(e) => {
        e.preventDefault();
        cancel();
      }}
      // Esc ditangani dialog ini saja, supaya menu di belakangnya (mis. panel notifikasi) tidak ikut tertutup.
      onKeyDown={(e) => e.key === "Escape" && e.stopPropagation()}
      // Klik di area gelap (di luar kotak) mengenai elemen dialog itu sendiri.
      onClick={(e) => e.target === e.currentTarget && cancel()}
      className="m-auto w-[min(440px,calc(100vw-32px))] max-w-none animate-pop rounded-[26px] border border-line bg-paper p-0 text-ink shadow-[0_40px_80px_-30px_rgba(29,43,40,.6)] backdrop:bg-[rgb(18_26_24/0.55)]"
    >
      <div className="flex flex-col gap-5 p-6 min-[480px]:p-7">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
            <Trash size={24} />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5 pt-1">
            <h2 id={`${id}-h`} className="m-0 text-lg leading-snug font-bold break-words">
              {title}
            </h2>
            {children && (
              <div id={`${id}-d`} className="text-sm leading-relaxed text-ink-3">
                {children}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2.5 min-[420px]:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
            className={cn(ui.btn, "border-0 bg-accent-700 text-cream hover:bg-accent-700 hover:text-cream disabled:cursor-wait")}
          >
            {busy ? <Spinner /> : <Trash />}
            {confirmLabel}
          </button>
          <button type="button" onClick={cancel} disabled={busy} autoFocus className={cn(ui.btn, ui.ghost)}>
            Batal
          </button>
        </div>
      </div>
    </dialog>
  );
}
