"use client";

import { useEffect, useRef, useState } from "react";
import { iconAction } from "@/components/admin/IconLink";
import { Spinner, Trash } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Tombol hapus ikon dua langkah: klik pertama meminta konfirmasi di tempat, Esc membatalkan. */
export function ConfirmDelete({
  label,
  question = "Hapus?",
  onConfirm,
  className,
}: {
  /** Untuk pembaca layar dan tooltip, mis. "Hapus jadwal Ngopi 12 Okt". */
  label: string;
  question?: string;
  /** Kembalikan false bila gagal, supaya tombol kembali ke keadaan awal. */
  onConfirm: () => Promise<boolean>;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
  }, [confirming]);

  const cancel = () => {
    setConfirming(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };

  const remove = async () => {
    setBusy(true);
    const ok = await onConfirm();
    if (!ok) {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <span
        role="group"
        aria-label={label}
        className={cn("inline-flex flex-wrap items-center gap-1.5 align-middle", className)}
        onKeyDown={(e) => e.key === "Escape" && !busy && cancel()}
      >
        <span className="text-[13px] font-semibold text-accent-700">{question}</span>
        <button
          ref={confirmButton}
          type="button"
          onClick={remove}
          disabled={busy}
          aria-busy={busy}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-accent-700 px-3.5 text-[13px] font-semibold text-cream disabled:cursor-wait"
        >
          {busy && <Spinner size={16} />}
          Ya, hapus
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-0 bg-transparent px-3 text-[13px] font-semibold text-ink-2 hover:bg-hover"
        >
          Batal
        </button>
      </span>
    );
  }

  return (
    <button
      ref={trigger}
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setConfirming(true)}
      className={cn(iconAction, "align-middle hover:bg-accent-100 hover:text-accent-700", className)}
    >
      <Trash size={22} />
    </button>
  );
}
