"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Avatar, type AvatarLook } from "@/components/Avatar";
import { Spinner } from "@/components/icons";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const item =
  "flex min-h-11 w-full cursor-pointer items-center rounded-[14px] border-0 bg-transparent px-3 text-left text-sm font-semibold text-ink-2 no-underline transition-colors hover:bg-tint hover:text-ink focus-visible:bg-tint focus-visible:text-ink";

/** Avatar anggota yang membuka menu: profil dan keluar. */
export function ProfileMenu({
  name,
  email,
  look,
  onProfile,
  librarian = false,
}: {
  name: string;
  email: string;
  look: AvatarLook;
  /** true saat sedang berada di halaman Profil. */
  onProfile: boolean;
  /** Pustakawan melihat jalan ke dasbor koleksi. */
  librarian?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Next menyimpan halaman yang pernah dibuka beserta state-nya. Pindah ke /masuk dijalankan sebagai transisi dan menu
  // ditutup lebih dulu, supaya saat anggota masuk lagi menu ini tidak muncul terbuka dengan "Keluar" yang loading terus.
  const [navigating, startNavigation] = useTransition();
  const leaving = signingOut || navigating;
  const [signOutError, setSignOutError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<HTMLElement[]>([]);

  const focusItem = (index: number) => {
    const list = items.current.filter(Boolean);
    list[(index + list.length) % list.length]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    focusItem(0);
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const list = items.current.filter(Boolean);
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") focusItem(at + 1);
    else if (e.key === "ArrowUp") focusItem(at - 1);
    else if (e.key === "Home") focusItem(0);
    else if (e.key === "End") focusItem(list.length - 1);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") setOpen(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const { error } = await authClient.signOut();
      if (error) throw error;
    } catch {
      setSigningOut(false);
      setSignOutError("Gagal keluar. Periksa koneksi lalu coba lagi.");
      return;
    }
    setSigningOut(false);
    setOpen(false);
    startNavigation(() => {
      router.push("/masuk");
      router.refresh();
    });
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        id={`${id}-trigger`}
        aria-label={`Menu akun ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-current={onProfile ? "page" : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex size-11 cursor-pointer overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-[0_0_0_2px_var(--color-ground),0_0_0_3.5px_var(--color-primary-300)] transition-shadow hover:shadow-[0_0_0_2px_var(--color-ground),0_0_0_3.5px_var(--color-primary-600)] aria-expanded:shadow-[0_0_0_2px_var(--color-ground),0_0_0_4px_var(--color-ink)] aria-[current=page]:shadow-[0_0_0_2px_var(--color-ground),0_0_0_4px_var(--color-ink)]"
      >
        <Avatar look={look} className="size-full" />
      </button>

      {open && (
        <div
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          onKeyDown={onMenuKey}
          className="absolute top-[calc(100%+10px)] right-0 z-30 flex w-[min(260px,calc(100vw-32px))] origin-top-right animate-pop flex-col gap-0.5 rounded-[20px] border border-line bg-paper p-1.5 shadow-[0_22px_40px_-24px_rgba(29,43,40,.55)]"
        >
          <div className="min-w-0 px-3 pt-2.5 pb-2.5">
            <strong className="block truncate text-sm text-ink">{name}</strong>
            <span className="block truncate text-[13px] text-muted">{email}</span>
          </div>
          <div role="separator" className="mx-2 mb-1 h-px bg-line-2" />
          <Link
            ref={(el) => {
              items.current[0] = el as HTMLElement;
            }}
            role="menuitem"
            href="/profil"
            className={item}
            onClick={() => setOpen(false)}
          >
            Profil saya
          </Link>
          {librarian && (
            <Link
              ref={(el) => {
                items.current[1] = el as HTMLElement;
              }}
              role="menuitem"
              href="/admin"
              className={item}
              onClick={() => setOpen(false)}
            >
              Kelola koleksi
            </Link>
          )}
          <button
            ref={(el) => {
              items.current[2] = el as HTMLElement;
            }}
            type="button"
            role="menuitem"
            className={cn(item, "justify-between gap-2 disabled:cursor-wait")}
            disabled={leaving}
            aria-busy={leaving}
            onClick={signOut}
          >
            Keluar
            {leaving && <Spinner size={18} />}
          </button>
          {signOutError && (
            <p role="alert" className="m-0 px-3 pt-1 pb-2 text-[13px] leading-snug font-semibold text-accent-700">
              {signOutError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
