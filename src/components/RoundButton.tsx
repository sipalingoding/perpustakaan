import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Tombol bulat untuk ikon (sebelumnya/berikutnya). Ukuran sentuh minimal 48px. */
export function RoundButton({
  label,
  disabled,
  onClick,
  size = "md",
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-full border-[1.5px] bg-cream text-ink transition hover:-translate-y-px hover:bg-white disabled:translate-y-0 disabled:cursor-default disabled:opacity-40",
        size === "lg" ? "size-[52px] border-primary-300" : "size-12 border-field",
      )}
    >
      {children}
    </button>
  );
}
