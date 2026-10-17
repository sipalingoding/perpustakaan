"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { iconAction } from "@/components/admin/IconLink";
import { Trash } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Tombol hapus ikon: kliknya membuka jendela konfirmasi di tengah layar. */
export function ConfirmDelete({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
  className,
}: {
  /** Untuk pembaca layar dan tooltip, mis. "Hapus jadwal Ngopi 12 Okt". */
  label: string;
  /** Judul jendela konfirmasi, mis. "Hapus foto 2?" */
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  /** Kembalikan false bila gagal, supaya jendela tertutup dan tombol kembali ke keadaan awal. */
  onConfirm: () => Promise<boolean>;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    setConfirming(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        onClick={() => setConfirming(true)}
        className={cn(iconAction, "align-middle hover:bg-accent-100 hover:text-accent-700", className)}
      >
        <Trash size={22} />
      </button>
      {confirming && (
        <ConfirmDialog
          title={title}
          confirmLabel={confirmLabel}
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        >
          {description}
        </ConfirmDialog>
      )}
    </>
  );
}
