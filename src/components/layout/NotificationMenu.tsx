"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { clearNotifications, markNotificationsRead } from "@/app/notifikasi/actions";
import { Alert, Bell, CalendarCheck, Coffee, Parcel } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { NotificationItem } from "@/lib/server/notifications";
import { useErrorToast, useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Lonceng di header: angka = notifikasi yang belum dibaca (perubahan status booking, pinjaman, dan sumbangan).
 * Membuka daftar menandai semuanya sudah dibaca; yang baru tetap disorot selama daftar terbuka.
 * Pengingat jatuh tempo (dihitung, bukan disimpan) tampil paling atas.
 */
export function NotificationMenu({
  items: serverItems,
  unread: initialUnread,
  due,
}: {
  items: NotificationItem[];
  unread: number;
  /** Pinjaman aktif yang jatuh tempo dalam 2 hari atau sudah lewat. */
  due: number;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [items, setItems] = useState(serverItems);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const setClearError = useErrorToast();
  const notify = useToast();

  // Data baru dari server (mis. setelah pindah halaman) menggantikan hitungan dan daftar lokal.
  const [serverUnread, setServerUnread] = useState(initialUnread);
  if (initialUnread !== serverUnread) {
    setServerUnread(initialUnread);
    setUnread(initialUnread);
  }
  const [lastServerItems, setLastServerItems] = useState(serverItems);
  if (serverItems !== lastServerItems) {
    setLastServerItems(serverItems);
    setItems(serverItems);
  }

  const clearAll = async () => {
    setClearing(true);
    setClearError("");
    try {
      const result = await clearNotifications();
      if (!result.ok) {
        setClearError(result.error);
        return;
      }
      setItems([]);
      setUnread(0);
      setConfirming(false);
      notify({ kind: "ok", text: "Semua notifikasi dibersihkan." });
      router.refresh();
    } catch {
      setClearError("Gagal membersihkan. Periksa koneksi lalu coba lagi.");
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setConfirming(false);
    setClearError("");
    if (next && unread > 0) {
      setUnread(0);
      markNotificationsRead().catch(() => setUnread(initialUnread));
    }
  };

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const label =
    unread > 0
      ? `Notifikasi: ${unread} belum dibaca`
      : due > 0
        ? `Notifikasi: ${due} buku perlu dikembalikan`
        : "Notifikasi";

  return (
    <div ref={root} className="relative" onKeyDown={(e) => e.key === "Escape" && open && close()}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={toggle}
        className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-2 transition-colors hover:bg-hover hover:text-ink aria-expanded:bg-hover aria-expanded:text-ink"
      >
        <Bell />
        {unread > 0 ? (
          <span className="absolute top-1 right-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent-600 px-1 text-[11px] leading-[18px] font-bold text-white shadow-[0_0_0_2px_var(--color-ground)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : (
          due > 0 && (
            <span className="absolute top-2.5 right-[11px] size-2 rounded-full bg-accent-600 shadow-[0_0_0_2px_var(--color-ground)]" />
          )
        )}
      </button>

      {open && (
        <div
          ref={panel}
          id={`${id}-panel`}
          role="region"
          aria-label="Notifikasi"
          tabIndex={-1}
          className="absolute top-[calc(100%+10px)] right-0 z-30 flex max-h-[min(520px,calc(100vh-120px))] w-[min(360px,calc(100vw-32px))] origin-top-right animate-pop flex-col overflow-hidden rounded-[20px] border border-line bg-paper shadow-[0_22px_40px_-24px_rgba(29,43,40,.55)] focus:outline-none"
        >
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line-2 py-1.5 pr-2 pl-4">
            <strong className="text-sm text-ink">Notifikasi</strong>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-haspopup="dialog"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-0 bg-transparent px-3 text-xs font-semibold text-ink-3 hover:bg-hover hover:text-ink"
              >
                Hapus semua
              </button>
            )}
            {confirming && (
              <ConfirmDialog
                title="Hapus semua notifikasi?"
                confirmLabel="Ya, hapus semua"
                busy={clearing}
                onConfirm={clearAll}
                onCancel={() => setConfirming(false)}
              >
                {items.length} notifikasi dihapus dari daftarmu. Pengingat jatuh tempo tetap muncul selama masih berlaku.
              </ConfirmDialog>
            )}
          </div>
          <ul className="m-0 flex list-none flex-col overflow-y-auto p-1.5">
            {due > 0 && (
              <li>
                <Item
                  href="/jadwal"
                  icon={<Alert size={20} />}
                  title="Pengingat jatuh tempo"
                  body={`${due} buku perlu dikembalikan dalam 2 hari atau sudah lewat.`}
                  highlight
                  onNavigate={() => setOpen(false)}
                />
              </li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <Item
                  href={n.href}
                  icon={
                    n.kind === "sumbangan" ? (
                      <Parcel size={20} />
                    ) : n.kind === "agenda" ? (
                      <Coffee size={20} />
                    ) : (
                      <CalendarCheck size={20} />
                    )
                  }
                  title={n.title}
                  body={n.body}
                  when={n.when}
                  highlight={n.unread}
                  onNavigate={() => setOpen(false)}
                />
              </li>
            ))}
            {items.length === 0 && due === 0 && (
              <li className="px-3 py-6 text-center text-sm leading-relaxed text-ink-3">
                Belum ada notifikasi. Kabar booking, peminjaman, sumbangan, dan agendamu akan muncul di sini.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Item({
  href,
  icon,
  title,
  body,
  when,
  highlight,
  onNavigate,
}: {
  href: string | null;
  icon: React.ReactNode;
  title: string;
  body: string;
  when?: string;
  highlight?: boolean;
  onNavigate: () => void;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full",
          highlight ? "bg-accent-100 text-accent-700" : "bg-tint-2 text-ink-3",
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
          {title}
          {highlight && when && (
            <>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-600" />
              <span className="sr-only">(baru)</span>
            </>
          )}
        </span>
        <span className="text-[13px] leading-snug text-ink-2">{body}</span>
        {when && <span className="text-xs text-muted">{when}</span>}
      </span>
    </>
  );
  const className = cn(
    "flex gap-3 rounded-[14px] px-2.5 py-2.5 text-left no-underline",
    highlight && "bg-tint",
    href && "hover:bg-hover focus-visible:bg-hover",
  );
  return href ? (
    <Link href={href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
