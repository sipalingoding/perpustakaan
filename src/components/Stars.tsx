import { Star, StarHalf, StarOutline } from "@/components/icons";
import { cn } from "@/lib/cn";

/** 4.5 -> "4,5" */
export const formatRating = (n: number) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Lima bintang baca-saja, dibulatkan ke setengah bintang. Labelnya dibaca pembaca layar. */
export function Stars({ value, size = 18, className }: { value: number; size?: number; className?: string }) {
  const halves = Math.round(value * 2);
  return (
    <span
      role="img"
      aria-label={`${formatRating(value)} dari 5 bintang`}
      className={cn("inline-flex shrink-0 items-center text-accent-600", className)}
    >
      {[1, 2, 3, 4, 5].map((i) =>
        halves >= i * 2 ? (
          <Star key={i} size={size} />
        ) : halves === i * 2 - 1 ? (
          <StarHalf key={i} size={size} />
        ) : (
          <StarOutline key={i} size={size} className="text-primary-500" />
        ),
      )}
    </span>
  );
}
