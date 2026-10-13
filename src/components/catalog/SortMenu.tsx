"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "@/components/icons";
import { cn } from "@/lib/cn";

export type SortOption<T extends string> = { value: T; label: string; hint: string };

/** Pengganti <select> bawaan: panel pilihan bergaya kartu kertas, tetap bisa dipakai penuh dengan keyboard. */
export function SortMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SortOption<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const show = (index = selectedIndex) => {
    setActive(index);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    close();
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      <span id={`${id}-label`} className="text-sm font-semibold text-ink-2">
        {label}
      </span>
      <div ref={root} className="relative">
        <button
          ref={button}
          type="button"
          id={`${id}-button`}
          aria-labelledby={`${id}-label ${id}-button`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onButtonKey}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-field bg-cream pr-3 pl-4 text-sm font-semibold text-ink transition-colors hover:border-primary-400 hover:bg-tint aria-expanded:border-ink"
        >
          {options[selectedIndex].label}
          <ChevronDown size={16} className={cn("text-ink-3 transition-transform duration-200", open && "rotate-180")} />
        </button>

        {open && (
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onListKey}
            className="absolute top-[calc(100%+8px)] right-0 z-20 m-0 flex w-[min(280px,calc(100vw-32px))] origin-top-right animate-pop list-none flex-col gap-0.5 rounded-[20px] border border-line bg-paper p-1.5 shadow-[0_22px_40px_-24px_rgba(29,43,40,.55)] focus:outline-none"
          >
            {options.map((o, i) => {
              const selected = i === selectedIndex;
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-[14px] px-3 py-2.5",
                    i === active && "bg-tint",
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center pt-0.5 text-primary-600">
                    {selected && <Check size={18} />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className={cn("text-sm font-semibold", selected ? "text-ink" : "text-ink-2")}>{o.label}</span>
                    <span className="text-[13px] leading-snug text-muted">{o.hint}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
