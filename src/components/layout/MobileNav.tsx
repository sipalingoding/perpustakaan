"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Cross, Menu } from "@/components/icons";
import type { NavKey } from "@/components/layout/SiteHeader";
import { cn } from "@/lib/cn";

const item =
  "flex min-h-11 items-center rounded-[14px] px-3 text-sm font-semibold text-ink-2 no-underline transition-colors hover:bg-tint hover:text-ink focus-visible:bg-tint focus-visible:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-cream aria-[current=page]:hover:bg-ink aria-[current=page]:hover:text-cream";

/**
 * Navigasi utama versi mobile: tombol sandwich yang membuka popup berisi tautan yang sama dengan nav desktop.
 * Hanya tampil di bawah 821px; di layar lebih lebar, nav biasa yang dipakai (lihat SiteHeader).
 */
export function MobileNav({
  items,
  active,
}: {
  items: ReadonlyArray<{ key: NavKey; href: string; label: string }>;
  active?: NavKey;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const links = useRef<HTMLAnchorElement[]>([]);

  const focusLink = (index: number) => {
    const list = links.current.filter(Boolean);
    list[(index + list.length) % list.length]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    focusLink(0);
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
    const list = links.current.filter(Boolean);
    const at = list.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === "ArrowDown") focusLink(at + 1);
    else if (e.key === "ArrowUp") focusLink(at - 1);
    else if (e.key === "Home") focusLink(0);
    else if (e.key === "End") focusLink(list.length - 1);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") setOpen(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  return (
    <div ref={root} className="relative min-[821px]:hidden">
      <button
        ref={trigger}
        type="button"
        aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-2 transition-colors hover:bg-hover hover:text-ink aria-expanded:bg-ink aria-expanded:text-cream"
      >
        {open ? <Cross size={22} /> : <Menu size={24} />}
      </button>

      {open && (
        <nav
          id={`${id}-menu`}
          aria-label="Navigasi utama"
          onKeyDown={onMenuKey}
          className="absolute top-[calc(100%+10px)] left-0 z-30 flex w-[min(240px,calc(100vw-32px))] origin-top-left animate-pop flex-col gap-0.5 rounded-[20px] border border-line bg-paper p-1.5 shadow-[0_22px_40px_-24px_rgba(29,43,40,.55)]"
        >
          {items.map((entry, i) => (
            <Link
              key={entry.key}
              ref={(el) => {
                if (el) links.current[i] = el;
              }}
              href={entry.href}
              aria-current={active === entry.key ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(item)}
            >
              {entry.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
