"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Check, Cross } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Isi notifikasi. `title` opsional sebagai judul tebal; `action` menambah tautan di bawah pesan. */
export type ToastInput = {
  kind: "ok" | "error";
  text: ReactNode;
  title?: string;
  action?: { href: string; label: string };
};

type ToastItem = ToastInput & { id: number };

/** Pesan sukses cukup sebentar; pesan gagal ditahan lebih lama supaya sempat dibaca dan diikuti. */
const DURATION = { ok: 5000, error: 9000 } as const;
/** Paling banyak tiga notifikasi bertumpuk; yang paling lama hilang lebih dulu. */
const MAX = 3;

/** Terima `null` supaya bisa langsung menggantikan `setNotice(null)` lama; `null` diabaikan. */
type Notify = (toast: ToastInput | null) => void;

const ToastContext = createContext<Notify | null>(null);

/** Tampilkan notifikasi melayang di atas layar yang tertutup sendiri. */
export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast harus dipakai di dalam <ToastProvider>.");
  return notify;
}

/**
 * Pengganti `setError(teks)` di formulir: teks tampil sebagai notifikasi gagal, teks kosong diabaikan.
 * Pesan per kotak isian tetap ditampilkan di bawah kotaknya, bukan lewat sini.
 */
export function useErrorToast(): (text: string | null) => void {
  const notify = useToast();
  return useCallback((text: string | null) => notify(text ? { kind: "error", text } : null), [notify]);
}

/**
 * Wadah semua notifikasi sukses dan gagal di aplikasi: melayang di atas tengah layar, lalu hilang sendiri.
 * Hitung mundur berhenti selama notifikasi disorot atau difokus, supaya sempat dibaca.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const close = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const notify = useCallback<Notify>((toast) => {
    if (!toast) return;
    const id = ++nextId.current;
    setToasts((all) => {
      // Pesan yang sama persis tidak ditumpuk; yang lama diganti supaya hitung mundurnya mulai lagi.
      const rest = all.filter((t) => !(t.kind === toast.kind && t.title === toast.title && t.text === toast.text));
      return [...rest, { ...toast, id }].slice(-MAX);
    });
  }, []);

  // Wadahnya popover supaya ikut lapisan teratas browser: tanpa ini notifikasi tertutup dialog modal (<dialog>).
  // Bila ada dialog modal yang terbuka, popover dibuka ulang supaya naik ke atas dialog itu.
  const layer = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = layer.current;
    if (!el?.showPopover) return;
    const open = el.matches(":popover-open");
    if (!toasts.length) {
      if (open) el.hidePopover();
      return;
    }
    if (open && document.querySelector("dialog:modal")) el.hidePopover();
    if (!el.matches(":popover-open")) el.showPopover();
  }, [toasts]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <section
        ref={layer}
        popover="manual"
        aria-label="Notifikasi"
        // Posisi ditulis langsung (bukan kelas) supaya pasti mengalahkan gaya bawaan popover (inset: 0) di browser.
        style={{ top: "calc(24px + env(safe-area-inset-top, 0px))", bottom: "auto" }}
        className="pointer-events-none fixed inset-x-0 z-[100] m-0 h-auto w-full max-w-none overflow-visible border-0 bg-transparent p-0"
      >
        <div className="flex flex-col items-center gap-2.5 px-4">
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onClose={close} />
          ))}
        </div>
      </section>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const { id, kind, title, text, action } = toast;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => onClose(id), DURATION[kind]);
    return () => clearTimeout(t);
  }, [paused, id, kind, onClose]);

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-[440px] animate-pop items-start gap-3 rounded-[20px] border bg-paper p-3 pr-1.5 shadow-[0_24px_44px_-22px_rgba(29,43,40,.6)]",
        kind === "ok" ? "border-line" : "border-accent-200",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
          kind === "ok" ? "bg-primary-100 text-primary-700" : "bg-accent-100 text-accent-700",
        )}
      >
        {kind === "ok" ? <Check size={20} /> : <Alert size={20} />}
      </span>
      <div className="min-w-0 flex-1 self-center py-1 text-sm leading-snug">
        {title && <strong className="block text-ink">{title}</strong>}
        <div className={cn(title ? "mt-0.5 text-[13px] text-ink-2" : "font-semibold text-ink")}>{text}</div>
        {action && (
          <Link href={action.href} onClick={() => onClose(id)} className="mt-1 inline-block text-[13px] font-bold">
            {action.label}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        aria-label="Tutup notifikasi"
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-3 hover:bg-hover hover:text-ink"
      >
        <Cross size={20} />
      </button>
    </div>
  );
}
