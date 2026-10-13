"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Cross } from "@/components/icons";

/**
 * Notifikasi singkat yang melayang di pojok layar, lalu hilang sendiri. Berhenti menghitung selama disorot atau
 * difokus, supaya sempat dibaca. Wadah live region selalu ada agar pembaca layar mengumumkan isinya.
 */
export function Toast({
  title,
  children,
  onClose,
  duration = 8000,
}: {
  title: string | null;
  children?: ReactNode;
  onClose: () => void;
  duration?: number;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!title || paused) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [title, paused, duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-50 flex justify-end sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      {title && (
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="pointer-events-auto flex w-full max-w-[420px] animate-pop items-start gap-3 rounded-[20px] border border-line bg-paper p-4 pr-2 shadow-[0_24px_44px_-22px_rgba(29,43,40,.6)]"
        >
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <Check size={20} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <strong className="block text-sm text-ink">{title}</strong>
            {children && <div className="mt-1 text-[13px] leading-snug text-ink-2">{children}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup notifikasi"
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-3 hover:bg-hover hover:text-ink"
          >
            <Cross size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
