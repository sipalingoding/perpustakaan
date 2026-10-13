"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Isian kata sandi dengan tombol mata untuk menampilkan atau menyembunyikan isinya. */
export function PasswordField({
  id,
  label,
  aside,
  hint,
  ...input
}: { id: string; label: string; aside?: ReactNode; hint?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label className={ui.label} htmlFor={id}>
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} className={cn(ui.field, "pr-14")} {...input} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-pressed={visible}
          aria-controls={id}
          title={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          {visible ? <EyeOff size={22} /> : <Eye size={22} />}
        </button>
      </div>
      {hint}
    </div>
  );
}
